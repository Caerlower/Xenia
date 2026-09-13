import { loadRootEnv } from '@xenia/config';
import {
  createPublicClient,
  createWalletClient,
  http,
  type Account,
  type Address,
  type Hex,
} from 'viem';
import { privateKeyToAccount, generatePrivateKey } from 'viem/accounts';
import { sepolia } from 'viem/chains';
import { XENIA_REGISTRY_ABI } from '@xenia/shared';

loadRootEnv(import.meta.url);

export const REGISTRY = process.env.XENIA_REGISTRY_ADDRESS as Address;
export const RPC = process.env.SEPOLIA_RPC_URL ?? 'https://ethereum-sepolia-rpc.publicnode.com';
export const X402_URL = process.env.X402_SERVICE_URL ?? 'http://localhost:4021';
export const MCP_STANDING_URL = process.env.SUBGRAPH_URL ?? '';
export const DISPUTE_WINDOW_MS = Number(process.env.DISPUTE_WINDOW_MS ?? 10_000);

export const publicClient = createPublicClient({
  chain: sepolia,
  transport: http(RPC),
});

export function walletFromEnv(envKey: string) {
  const pk = process.env[envKey] as Hex | undefined;
  if (!pk) throw new Error(`${envKey} required`);
  const account = privateKeyToAccount(pk);
  const wallet = createWalletClient({
    account,
    chain: sepolia,
    transport: http(RPC),
  });
  return { account, wallet };
}

/** Prefer HOST_PRIVATE_KEY, then PRIVATE_KEY / OPERATOR_PRIVATE_KEY. */
export function funderFromEnv() {
  for (const key of ['HOST_PRIVATE_KEY', 'PRIVATE_KEY', 'OPERATOR_PRIVATE_KEY'] as const) {
    if (process.env[key]) return { ...walletFromEnv(key), envKey: key };
  }
  throw new Error(
    'Need HOST_PRIVATE_KEY, PRIVATE_KEY, or OPERATOR_PRIVATE_KEY to fund demo agents',
  );
}

/** Victim for slash path; falls back to the funder wallet if unset. */
export function victimFromEnv() {
  if (process.env.VICTIM_PRIVATE_KEY) {
    return { ...walletFromEnv('VICTIM_PRIVATE_KEY'), envKey: 'VICTIM_PRIVATE_KEY' };
  }
  return funderFromEnv();
}

/** Ephemeral wallet for a single demo run (not from env). */
export function freshWallet() {
  const account = privateKeyToAccount(generatePrivateKey());
  const wallet = createWalletClient({
    account,
    chain: sepolia,
    transport: http(RPC),
  });
  return { account, wallet };
}

/** Send ETH from funder so a fresh agent can pay gas / premiums. */
export async function fundAddress(
  funder: Account,
  to: Address,
  value: bigint,
) {
  const wallet = createWalletClient({
    account: funder,
    chain: sepolia,
    transport: http(RPC),
  });
  const hash = await wallet.sendTransaction({
    account: funder,
    chain: sepolia,
    to,
    value,
  });
  await publicClient.waitForTransactionReceipt({ hash });
  return hash;
}

export async function writeRegistry(
  account: Account,
  functionName: 'registerAgent' | 'createBacking' | 'payPremium' | 'reportDefault' | 'resolveDispute' | 'revokeBacking',
  args: readonly unknown[],
  value?: bigint,
) {
  if (!REGISTRY) throw new Error('XENIA_REGISTRY_ADDRESS required');
  const wallet = createWalletClient({
    account,
    chain: sepolia,
    transport: http(RPC),
  });

  try {
    await publicClient.simulateContract({
      address: REGISTRY,
      abi: XENIA_REGISTRY_ABI,
      functionName,
      args: args as never,
      value,
      account,
    });
  } catch (err: unknown) {
    const anyErr = err as { shortMessage?: string; message?: string };
    throw new Error(
      `${functionName} would revert: ${anyErr.shortMessage || anyErr.message || String(err)}`,
    );
  }

  const hash = await wallet.writeContract({
    address: REGISTRY,
    abi: XENIA_REGISTRY_ABI,
    functionName,
    args: args as never,
    value,
    account,
    chain: sepolia,
  }).catch((err: unknown) => {
    const anyErr = err as { shortMessage?: string; message?: string };
    throw new Error(
      `${functionName} failed: ${anyErr.shortMessage || anyErr.message || String(err)}`,
    );
  });
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status === 'reverted') {
    throw new Error(
      `${functionName} reverted on-chain (tx ${hash}). Often insufficient agent gas after register — retry.`,
    );
  }
  return { hash, receipt };
}

export function log(step: string, msg: string) {
  console.error(`\n[${step}] ${msg}`);
}

export async function sleep(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
}

export async function checkStandingViaMcpShape(agentId: string) {
  // Same payload shape as mcp-server check_agent_standing
  if (!MCP_STANDING_URL) {
    const onchain = await publicClient.readContract({
      address: REGISTRY,
      abi: XENIA_REGISTRY_ABI,
      functionName: 'isInGoodStanding',
      args: [agentId as Address],
    });
    return { agentId, inGoodStanding: onchain, source: 'onchain' };
  }

  const query = `
    query ($id: ID!) {
      agent(id: $id) {
        id ensName standingScore inGoodStanding
        premiumsPaidCount defaultsCount slashesCount
        backings { id host stakeAmount status premiumsPaid }
      }
    }`;
  const res = await fetch(MCP_STANDING_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables: { id: agentId.toLowerCase() } }),
  });
  return res.json();
}
