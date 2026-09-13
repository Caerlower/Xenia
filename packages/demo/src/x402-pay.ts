/**
 * Hedera x402 payer — signs a payment and completes POST /xenia/check.
 * Settlement is performed by apps/api (resource server) via Blocky402.
 *
 * payTo (HEDERA_SERVICE_*) and payer must be different accounts — a self-transfer
 * nets to 0 and fails facilitator amount checks. When only one account is
 * configured, we auto-create a small funded payer on testnet and cache it.
 */
import { createRequire } from 'node:module';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { loadRootEnv } from '@xenia/config';
import { ExactHederaScheme } from '@x402/hedera/exact/client';
import {
  AccountId,
  Client,
  Hbar,
  PrivateKey,
  TransferTransaction,
  createClientHederaSigner,
} from '@x402/hedera';

const ROOT_ENV_PATH = loadRootEnv(import.meta.url);

const require = createRequire(import.meta.url);
const hederaEntry = require.resolve('@x402/hedera');
const hederaRoot = dirname(hederaEntry);
// Walk up until we find node_modules/@x402/hedera (entry may be deep in dist/)
function packageRootFromEntry(entry: string): string {
  let dir = dirname(entry);
  for (let i = 0; i < 6; i++) {
    if (existsSync(join(dir, 'package.json'))) return dir;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return hederaRoot;
}
const hederaPkgRoot = packageRootFromEntry(hederaEntry);
// Resolve AccountCreate from the same SDK copy @x402/hedera uses (avoid instanceof breaks).
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { AccountCreateTransaction } = require(
  require.resolve('@hiero-ledger/sdk', { paths: [hederaPkgRoot] }),
) as {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  AccountCreateTransaction: new () => any;
};

const FACILITATOR =
  process.env.X402_FACILITATOR_URL?.trim() ||
  'https://api.testnet.blocky402.com';

const X402_URL = process.env.X402_SERVICE_URL?.trim() || 'http://localhost:4021';

const PAYER_CACHE =
  process.env.HEDERA_PAYER_CACHE?.trim() ||
  join(dirname(ROOT_ENV_PATH), '.xenia-hedera-payer.json');

/** ~0.5 HBAR initial balance for auto-provisioned payer (covers many 0.001 HBAR checks). */
const PAYER_SEED_TINYBARS = 50_000_000n;

export type PaidStandingResult = {
  agentId: string;
  httpStatus: number;
  paid: boolean;
  challenged: boolean;
  settlementTx?: string;
  hashscanUrl?: string;
  standingScore?: number;
  inGoodStanding?: boolean;
  raw?: unknown;
};

type PayerCreds = { accountId: string; key: string };

function parseEcdsaKey(key: string): ReturnType<typeof PrivateKey.fromStringECDSA> {
  const normalized = key.startsWith('0x') ? key : `0x${key}`;
  return PrivateKey.fromStringECDSA(normalized);
}

function configuredPayer(): PayerCreds | null {
  const accountId =
    process.env.HEDERA_PAYER_ACCOUNT_ID?.trim() ||
    process.env.HEDERA_SERVICE_ACCOUNT_ID?.trim();
  const key =
    process.env.HEDERA_PAYER_PRIVATE_KEY?.trim() ||
    process.env.HEDERA_SERVICE_PRIVATE_KEY?.trim();
  if (!accountId || !key) return null;
  return { accountId, key };
}

function serviceCreds(): PayerCreds {
  const accountId = process.env.HEDERA_SERVICE_ACCOUNT_ID?.trim();
  const key = process.env.HEDERA_SERVICE_PRIVATE_KEY?.trim();
  if (!accountId || !key) {
    throw new Error(
      'Set HEDERA_SERVICE_ACCOUNT_ID + HEDERA_SERVICE_PRIVATE_KEY (x402 payTo / seed)',
    );
  }
  return { accountId, key };
}

function loadCachedPayer(): PayerCreds | null {
  try {
    if (!existsSync(PAYER_CACHE)) return null;
    const raw = JSON.parse(readFileSync(PAYER_CACHE, 'utf8')) as {
      accountId?: string;
      privateKey?: string;
    };
    if (!raw.accountId || !raw.privateKey) return null;
    return { accountId: raw.accountId, key: raw.privateKey };
  } catch {
    return null;
  }
}

function saveCachedPayer(creds: PayerCreds) {
  mkdirSync(dirname(PAYER_CACHE), { recursive: true });
  writeFileSync(
    PAYER_CACHE,
    `${JSON.stringify(
      {
        accountId: creds.accountId,
        privateKey: creds.key.startsWith('0x') ? creds.key : `0x${creds.key}`,
        note: 'Auto-created x402 payer (must differ from HEDERA_SERVICE payTo). Do not commit.',
      },
      null,
      2,
    )}\n`,
    { mode: 0o600 },
  );
}

async function mirrorHbarTinybars(accountId: string): Promise<bigint> {
  try {
    const res = await fetch(
      `https://testnet.mirrornode.hedera.com/api/v1/accounts/${accountId}`,
      { signal: AbortSignal.timeout(8000) },
    );
    if (!res.ok) return 0n;
    const body = (await res.json()) as { balance?: { balance?: number } };
    return BigInt(body.balance?.balance ?? 0);
  } catch {
    return 0n;
  }
}

async function withServiceClient<T>(
  fn: (client: Client, service: PayerCreds) => Promise<T>,
): Promise<T> {
  const service = serviceCreds();
  const client = Client.forTestnet().setOperator(
    AccountId.fromString(service.accountId),
    parseEcdsaKey(service.key),
  );
  try {
    return await fn(client, service);
  } finally {
    client.close();
  }
}

async function fundPayer(accountId: string, tinybars: bigint) {
  await withServiceClient(async (client, service) => {
    await new TransferTransaction()
      .addHbarTransfer(
        AccountId.fromString(service.accountId),
        Hbar.fromTinybars((-tinybars).toString()),
      )
      .addHbarTransfer(AccountId.fromString(accountId), Hbar.fromTinybars(tinybars.toString()))
      .execute(client)
      .then((r) => r.getReceipt(client));
  });
}

/**
 * Hedera exact scheme rejects self-transfers (net to payTo is 0). Prefer an
 * explicit HEDERA_PAYER_*; otherwise reuse cache or create a funded child account.
 */
async function resolvePayer(payTo: string): Promise<PayerCreds> {
  const explicitPayer =
    process.env.HEDERA_PAYER_ACCOUNT_ID?.trim() &&
    process.env.HEDERA_PAYER_PRIVATE_KEY?.trim()
      ? {
          accountId: process.env.HEDERA_PAYER_ACCOUNT_ID.trim(),
          key: process.env.HEDERA_PAYER_PRIVATE_KEY.trim(),
        }
      : null;

  if (explicitPayer) {
    if (explicitPayer.accountId === payTo) {
      throw new Error(
        'HEDERA_PAYER_ACCOUNT_ID must differ from HEDERA_SERVICE_ACCOUNT_ID (payTo) — self-pay fails x402 amount checks',
      );
    }
    return explicitPayer;
  }

  const cached = loadCachedPayer();
  if (cached && cached.accountId !== payTo) {
    const bal = await mirrorHbarTinybars(cached.accountId);
    if (bal < 1_000_000n) {
      console.log(
        `[x402] topping up payer ${cached.accountId} (balance ${bal} tinybars)`,
      );
      await fundPayer(cached.accountId, PAYER_SEED_TINYBARS);
    }
    return cached;
  }

  const configured = configuredPayer();
  if (configured && configured.accountId !== payTo) return configured;

  const service = serviceCreds();
  if (service.accountId !== payTo) return service;

  console.log(
    '[x402] payTo == payer; creating distinct testnet payer (cached at',
    PAYER_CACHE,
    ')',
  );

  const newKey = PrivateKey.generateECDSA();
  const accountId = await withServiceClient(async (client, service) => {
    const tx = new AccountCreateTransaction()
      .setKey(newKey.publicKey)
      .setInitialBalance(new Hbar(0.5));
    const response = await tx.execute(client);
    const receipt = await response.getReceipt(client);
    const id = receipt.accountId?.toString();
    if (!id) {
      throw new Error('AccountCreateTransaction succeeded but receipt.accountId missing');
    }
    // Explicit top-up in case create landed with 0 (seen on some ECDSA creates).
    await new TransferTransaction()
      .addHbarTransfer(AccountId.fromString(service.accountId), new Hbar(-0.5))
      .addHbarTransfer(AccountId.fromString(id), new Hbar(0.5))
      .execute(client)
      .then((r) => r.getReceipt(client));
    return id;
  });

  const creds: PayerCreds = {
    accountId,
    key: `0x${newKey.toStringRaw()}`,
  };
  saveCachedPayer(creds);
  console.log(`[x402] provisioned payer ${accountId}`);
  return creds;
}

async function fetchFeePayer(): Promise<string> {
  const supported = (await fetch(`${FACILITATOR}/supported`).then((r) =>
    r.json(),
  )) as {
    kinds?: Array<{ network?: string; extra?: { feePayer?: string } }>;
    signers?: Record<string, string[]>;
  };
  const hedera = supported.kinds?.find((k) => k.network === 'hedera:testnet');
  const feePayer =
    hedera?.extra?.feePayer ?? supported.signers?.['hedera:*']?.[0];
  if (!feePayer) {
    throw new Error(
      `Facilitator ${FACILITATOR} does not advertise hedera:testnet feePayer`,
    );
  }
  return feePayer;
}

function scoreFromBody(body: unknown): {
  standingScore?: number;
  inGoodStanding?: boolean;
  settlementTx?: string;
  hashscanUrl?: string;
} {
  const b = body as {
    agent?: { standingScore?: number; inGoodStanding?: boolean };
    inGoodStanding?: boolean;
    settlementTx?: string;
    hashscanUrl?: string;
  };
  const out: {
    standingScore?: number;
    inGoodStanding?: boolean;
    settlementTx?: string;
    hashscanUrl?: string;
  } = {
    settlementTx: b.settlementTx,
    hashscanUrl: b.hashscanUrl,
  };
  if (typeof b.agent?.standingScore === 'number') {
    out.standingScore = b.agent.standingScore;
    out.inGoodStanding = b.agent.inGoodStanding;
  } else if (typeof b.inGoodStanding === 'boolean') {
    out.standingScore = b.inGoodStanding ? 60 : 0;
    out.inGoodStanding = b.inGoodStanding;
  }
  return out;
}

/**
 * 1) Unpaid probe → expect 402 + accepts[]
 * 2) Sign Hedera exact payment for those requirements
 * 3) Retry /xenia/check with PAYMENT-SIGNATURE (API verifies + settles)
 */
export async function paidStandingCheck(
  agentId: string,
): Promise<PaidStandingResult> {
  const unpaid = await fetch(`${X402_URL}/xenia/check`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ agentId }),
  });
  const unpaidBody = await unpaid.json().catch(() => ({}));

  if (unpaid.status !== 402) {
    if (unpaid.ok) {
      const scored = scoreFromBody(unpaidBody);
      return {
        agentId,
        httpStatus: unpaid.status,
        paid: Boolean((unpaidBody as { paid?: boolean }).paid),
        challenged: false,
        ...scored,
        raw: unpaidBody,
      };
    }
    throw new Error(
      `x402 check expected HTTP 402, got ${unpaid.status}: ${JSON.stringify(unpaidBody).slice(0, 200)}`,
    );
  }

  const accepts = (unpaidBody as { accepts?: Array<Record<string, unknown>> })
    .accepts;
  const baseReqs = accepts?.[0];
  if (!baseReqs?.payTo) {
    throw new Error('402 response missing accepts[] payment requirements');
  }

  const feePayer =
    (baseReqs.extra as { feePayer?: string } | undefined)?.feePayer ||
    (await fetchFeePayer());

  const paymentRequirements = {
    scheme: 'exact' as const,
    network: 'hedera:testnet' as const,
    amount: String(baseReqs.amount ?? '100000'),
    payTo: String(baseReqs.payTo),
    maxTimeoutSeconds: Number(baseReqs.maxTimeoutSeconds ?? 300),
    asset: String(baseReqs.asset ?? '0.0.0'),
    extra: { feePayer },
  };

  const { accountId, key } = await resolvePayer(paymentRequirements.payTo);
  const signer = createClientHederaSigner(
    accountId,
    parseEcdsaKey(key),
    { network: 'hedera:testnet' },
  );
  const scheme = new ExactHederaScheme(signer);
  const signed = await scheme.createPaymentPayload(2, paymentRequirements);
  const paymentPayload = {
    x402Version: 2,
    scheme: 'exact',
    network: 'hedera:testnet',
    accepted: paymentRequirements,
    payload: signed.payload,
  };

  const xPayment = Buffer.from(JSON.stringify(paymentPayload)).toString(
    'base64',
  );
  const paidRes = await fetch(`${X402_URL}/xenia/check`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'PAYMENT-SIGNATURE': xPayment,
      'X-PAYMENT': xPayment,
    },
    body: JSON.stringify({ agentId }),
  });
  const paidBody = await paidRes.json().catch(() => ({}));
  if (!paidRes.ok) {
    throw new Error(
      `Paid x402 check failed HTTP ${paidRes.status}: ${JSON.stringify(paidBody).slice(0, 280)}`,
    );
  }

  const scored = scoreFromBody(paidBody);
  return {
    agentId,
    httpStatus: paidRes.status,
    paid: true,
    challenged: true,
    ...scored,
    raw: paidBody,
  };
}

export async function assertX402ServiceUp() {
  try {
    const res = await fetch(`${X402_URL}/health`, {
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) throw new Error(`health ${res.status}`);
  } catch (e) {
    throw new Error(
      `x402 API not reachable at ${X402_URL} (${e instanceof Error ? e.message : e}). Run: pnpm dev:api`,
    );
  }
}
