import { loadRootEnv } from '@xenia/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import {
  createPublicClient,
  createWalletClient,
  http,
  type Hex,
  type Address,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { sepolia } from 'viem/chains';
import { XENIA_REGISTRY_ABI } from '@xenia/shared';
import { CHECK_PRICE, NETWORK, createResourceServer } from './x402.js';

loadRootEnv(import.meta.url);

const PORT = Number(process.env.PORT ?? 4021);
const SERVICE_ACCOUNT = process.env.HEDERA_SERVICE_ACCOUNT_ID ?? '';
const REGISTRY = (process.env.XENIA_REGISTRY_ADDRESS ?? '') as Address;
const SUBGRAPH_URL = process.env.SUBGRAPH_URL ?? '';
const OPERATOR_KEY = process.env.OPERATOR_PRIVATE_KEY as Hex | undefined;
const RPC_URL = process.env.SEPOLIA_RPC_URL ?? 'https://ethereum-sepolia-rpc.publicnode.com';

if (!SERVICE_ACCOUNT) {
  console.warn('⚠ HEDERA_SERVICE_ACCOUNT_ID missing — x402 check will reject settlements');
}

const resourceServer = createResourceServer();

const publicClient = createPublicClient({
  chain: sepolia,
  transport: http(RPC_URL),
});

const operator = OPERATOR_KEY ? privateKeyToAccount(OPERATOR_KEY) : null;
const walletClient = operator
  ? createWalletClient({
      account: operator,
      chain: sepolia,
      transport: http(RPC_URL),
    })
  : null;

type PaymentRequirements = {
  scheme: 'exact';
  network: typeof NETWORK;
  amount?: string;
  price?: string | { asset: string; amount: string };
  payTo: string;
  maxTimeoutSeconds: number;
  asset: string;
  extra?: Record<string, unknown>;
};

function buildCheckRequirements(): PaymentRequirements {
  return {
    scheme: 'exact',
    network: NETWORK,
    payTo: SERVICE_ACCOUNT,
    maxTimeoutSeconds: 300,
    asset: CHECK_PRICE.asset,
    amount: CHECK_PRICE.amount,
    price: CHECK_PRICE,
  };
}

/**
 * Fastify adaptation of @x402/express paymentMiddleware from the
 * hedera-dev/x402-inference-pay-per-request-poc pattern.
 */
async function requireX402Payment(
  paymentHeader: string | undefined,
  requirements: PaymentRequirements,
): Promise<{ ok: true } | { ok: false; status: number; body: unknown }> {
  if (!paymentHeader) {
    return {
      ok: false,
      status: 402,
      body: {
        x402Version: 2,
        error: 'Payment required to check agent standing',
        accepts: [requirements],
      },
    };
  }

  let paymentPayload: unknown;
  try {
    paymentPayload = JSON.parse(Buffer.from(paymentHeader, 'base64').toString('utf8'));
  } catch {
    try {
      paymentPayload = JSON.parse(paymentHeader);
    } catch {
      return { ok: false, status: 400, body: { error: 'Invalid PAYMENT-SIGNATURE header' } };
    }
  }

  try {
    // Resource server + facilitator verify/settle (Blocky402 / x402.org)
    const verify = await (resourceServer as unknown as {
      verify: (payload: unknown, reqs: unknown) => Promise<{ isValid: boolean; invalidReason?: string }>;
    }).verify(paymentPayload, requirements);

    if (!verify.isValid) {
      return {
        ok: false,
        status: 402,
        body: {
          x402Version: 2,
          error: verify.invalidReason ?? 'Payment verification failed',
          accepts: [requirements],
        },
      };
    }

    // Settle asynchronously-compatible; await for demo clarity
    const settle = await (resourceServer as unknown as {
      settle: (payload: unknown, reqs: unknown) => Promise<{ success: boolean; errorReason?: string }>;
    }).settle?.(paymentPayload, requirements);

    if (settle && settle.success === false) {
      return {
        ok: false,
        status: 402,
        body: { error: settle.errorReason ?? 'Settlement failed', accepts: [requirements] },
      };
    }

    return { ok: true };
  } catch (err) {
    // Fallback: call facilitator HTTP API directly (matches Blocky402 docs)
    const facilitatorUrl =
      process.env.X402_FACILITATOR_URL ?? 'https://api.blocky402.com';
    const body = { x402Version: 2, paymentPayload, paymentRequirements: requirements };

    const verifyRes = await fetch(`${facilitatorUrl}/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const verifyJson = (await verifyRes.json()) as { isValid?: boolean; invalidReason?: string };
    if (!verifyJson.isValid) {
      return {
        ok: false,
        status: 402,
        body: {
          x402Version: 2,
          error: verifyJson.invalidReason ?? 'Payment verification failed',
          accepts: [requirements],
        },
      };
    }

    await fetch(`${facilitatorUrl}/settle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    return { ok: true };
  }
}

async function queryStanding(agentId: string) {
  if (!SUBGRAPH_URL) {
    if (!REGISTRY) {
      return { error: 'SUBGRAPH_URL or XENIA_REGISTRY_ADDRESS required', agentId };
    }
    const standing = await publicClient.readContract({
      address: REGISTRY,
      abi: XENIA_REGISTRY_ABI,
      functionName: 'isInGoodStanding',
      args: [agentId as Address],
    });
    return {
      agentId,
      inGoodStanding: standing,
      source: 'onchain-fallback',
      note: 'Set SUBGRAPH_URL for full standing score + history',
    };
  }

  const query = `
    query ($id: ID!) {
      agent(id: $id) {
        id
        ensName
        standingScore
        inGoodStanding
        premiumsPaidCount
        defaultsCount
        slashesCount
        backings {
          id
          host
          stakeAmount
          premiumRate
          status
          premiumsPaid
        }
      }
    }
  `;

  const res = await fetch(SUBGRAPH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query,
      variables: { id: agentId.toLowerCase() },
    }),
  });
  const json = (await res.json()) as { data?: { agent: unknown }; errors?: unknown };
  return { agentId, ...(json.data?.agent ? { agent: json.data.agent } : { agent: null }), errors: json.errors };
}

function requireAuth(header: string | undefined, expected: string | undefined, role: string) {
  if (!expected) return { ok: true as const }; // demo mode without auth secrets
  if (header !== `Bearer ${expected}`) {
    return { ok: false as const, error: `${role} authentication required` };
  }
  return { ok: true as const };
}

async function main() {
  const app = Fastify({ logger: true });
  await app.register(cors, { origin: true });

  app.get('/health', async () => ({
    status: 'ok',
    network: NETWORK,
    registry: REGISTRY || null,
    facilitator: process.env.X402_FACILITATOR_URL ?? 'https://api.blocky402.com',
  }));

  /**
   * POST /xenia/check — x402-gated standing check (pay ~0.001 HBAR via Blocky402).
   * Body: { agentId: "0x..." }
   * Header: PAYMENT-SIGNATURE (base64 x402 v2 payload) after 402 challenge.
   */
  app.post<{ Body: { agentId?: string } }>('/xenia/check', async (req, reply) => {
    const agentId = req.body?.agentId;
    if (!agentId) {
      return reply.code(400).send({ error: 'agentId required' });
    }

    const paymentHeader =
      (req.headers['payment-signature'] as string | undefined) ??
      (req.headers['x-payment'] as string | undefined);

    const gate = await requireX402Payment(paymentHeader, buildCheckRequirements());
    if (!gate.ok) {
      return reply.code(gate.status).send(gate.body);
    }

    const result = await queryStanding(agentId);
    return reply.send({ paid: true, ...result });
  });

  /**
   * POST /xenia/back — host-authenticated createBacking on Sepolia.
   * Body: { agent, stakeAmount, premiumRate } (wei strings)
   */
  app.post<{
    Body: { agent?: string; stakeAmount?: string; premiumRate?: string };
  }>('/xenia/back', async (req, reply) => {
    const auth = requireAuth(
      req.headers.authorization,
      process.env.HOST_API_TOKEN,
      'Host',
    );
    if (!auth.ok) return reply.code(401).send({ error: auth.error });

    if (!walletClient || !operator || !REGISTRY) {
      return reply.code(503).send({
        error: 'OPERATOR_PRIVATE_KEY and XENIA_REGISTRY_ADDRESS required for /xenia/back',
      });
    }

    const { agent, stakeAmount, premiumRate } = req.body ?? {};
    if (!agent || !stakeAmount || !premiumRate) {
      return reply.code(400).send({ error: 'agent, stakeAmount, premiumRate required' });
    }

    const hash = await walletClient.writeContract({
      address: REGISTRY,
      abi: XENIA_REGISTRY_ABI,
      functionName: 'createBacking',
      args: [agent as Address, BigInt(stakeAmount), BigInt(premiumRate)],
      value: BigInt(stakeAmount),
      chain: sepolia,
      account: operator,
    });

    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    return reply.send({ txHash: hash, status: receipt.status });
  });

  /**
   * POST /xenia/premium — guest-authenticated payPremium (scheduler-friendly).
   * Body: { backingId }
   */
  app.post<{ Body: { backingId?: string; premiumAmount?: string } }>(
    '/xenia/premium',
    async (req, reply) => {
      const auth = requireAuth(
        req.headers.authorization,
        process.env.GUEST_API_TOKEN,
        'Guest',
      );
      if (!auth.ok) return reply.code(401).send({ error: auth.error });

      if (!walletClient || !operator || !REGISTRY) {
        return reply.code(503).send({
          error: 'OPERATOR_PRIVATE_KEY and XENIA_REGISTRY_ADDRESS required for /xenia/premium',
        });
      }

      const { backingId, premiumAmount } = req.body ?? {};
      if (!backingId || !premiumAmount) {
        return reply.code(400).send({ error: 'backingId and premiumAmount required' });
      }

      const hash = await walletClient.writeContract({
        address: REGISTRY,
        abi: XENIA_REGISTRY_ABI,
        functionName: 'payPremium',
        args: [backingId as Hex],
        value: BigInt(premiumAmount),
        chain: sepolia,
        account: operator,
      });

      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      return reply.send({ txHash: hash, status: receipt.status });
    },
  );

  await app.listen({ port: PORT, host: '0.0.0.0' });
  console.log(`\nXenia x402 service on http://localhost:${PORT}`);
  console.log(`  POST /xenia/check   — x402-gated standing check (Hedera HBAR)`);
  console.log(`  POST /xenia/back    — host createBacking (Sepolia)`);
  console.log(`  POST /xenia/premium — guest payPremium (Sepolia)\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
