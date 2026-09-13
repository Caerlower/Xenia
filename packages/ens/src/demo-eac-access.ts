/**
 * ENS track qualification demo:
 * 1) Non-host (agent) fails to setText on xenia.host
 * 2) Host succeeds
 */
import { loadRootEnv } from '@xenia/config';
import {
  createWalletClient,
  createPublicClient,
  http,
  type Hex,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { sepolia } from 'viem/chains';
import {
  agentNode,
  agentSubname,
  permissionedResolverAbi,
  requireEnvAddress,
} from './config.js';

const envPath = loadRootEnv(import.meta.url);

function normalizePk(raw: string): Hex {
  return (raw.startsWith('0x') ? raw : `0x${raw}`) as Hex;
}

async function trySet(
  label: string,
  pk: Hex,
  who: string,
  value: string,
): Promise<'ok' | 'fail'> {
  const resolver = requireEnvAddress('ENS_RESOLVER_ADDRESS');
  const rpc = process.env.SEPOLIA_RPC_URL ?? 'https://ethereum-sepolia-rpc.publicnode.com';
  const account = privateKeyToAccount(pk);
  const wallet = createWalletClient({ account, chain: sepolia, transport: http(rpc) });
  const publicClient = createPublicClient({ chain: sepolia, transport: http(rpc) });
  const node = agentNode(label);

  console.log(`\n[${who} ${account.address}] setText xenia.host = ${value} on ${agentSubname(label)}`);
  try {
    const hash = await wallet.writeContract({
      address: resolver,
      abi: permissionedResolverAbi,
      functionName: 'setText',
      args: [node, 'xenia.host', value],
      account,
      chain: sepolia,
    });
    await publicClient.waitForTransactionReceipt({ hash });
    console.log(`  ✓ SUCCESS ${hash}`);
    return 'ok';
  } catch (err) {
    console.log(`  ✗ FAILED (expected for non-host): ${(err as Error).message?.slice(0, 200)}`);
    return 'fail';
  }
}

async function main() {
  console.log(`env: ${envPath}`);
  const agentPk = process.env.AGENT_A_PRIVATE_KEY;
  const hostPk = process.env.HOST_PRIVATE_KEY;
  if (!agentPk || !hostPk) {
    throw new Error(
      `AGENT_A_PRIVATE_KEY and HOST_PRIVATE_KEY required (loaded env from ${envPath})`,
    );
  }

  const agentResult = await trySet('agent-a', normalizePk(agentPk), 'AGENT', '0xEvilShouldFail');
  const hostResult = await trySet(
    'agent-a',
    normalizePk(hostPk),
    'HOST',
    process.env.HOST_ADDRESS ?? '0xHost',
  );

  if (agentResult !== 'fail' || hostResult !== 'ok') {
    throw new Error(
      `EAC demo unexpected: agent=${agentResult} host=${hostResult} (want agent=fail, host=ok)`,
    );
  }

  console.log('\n✓ Demo complete: only the host can edit backing text records.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
