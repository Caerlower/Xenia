/**
 * Write backing data as text records on each agent subname, then grant
 * Enhanced Access Control so ONLY the host can edit those keys.
 */
import {
  getClients,
  agentSubname,
  agentNode,
  dnsEncodeName,
  requireEnvAddress,
  permissionedResolverAbi,
  BACKING_TEXT_KEYS,
} from './config.js';

type BackingRecord = {
  label: string;
  host: string;
  stake: string;
  premiumStatus: string;
  backingId: string;
};

async function main() {
  const { walletClient, account, publicClient } = getClients();
  const resolver = requireEnvAddress('ENS_RESOLVER_ADDRESS');
  const host = process.env.HOST_ADDRESS as `0x${string}` | undefined;
  if (!host) throw new Error('HOST_ADDRESS required');

  const records: BackingRecord[] = [
    {
      label: 'agent-a',
      host,
      stake: process.env.AGENT_A_STAKE ?? process.env.STAKE_WEI ?? '10000000000000000',
      premiumStatus: 'current',
      backingId: process.env.AGENT_A_BACKING_ID ?? '0x',
    },
    {
      label: 'agent-b',
      host,
      stake: process.env.AGENT_B_STAKE ?? '0',
      premiumStatus: 'slashed',
      backingId: process.env.AGENT_B_BACKING_ID ?? '0x',
    },
  ];

  for (const r of records) {
    if (!r.backingId || r.backingId === '0x') {
      console.warn(`skip ${r.label}: backing id missing`);
      continue;
    }

    const name = agentSubname(r.label);
    const node = agentNode(r.label);
    const toName = dnsEncodeName(name);
    const values: Record<(typeof BACKING_TEXT_KEYS)[number], string> = {
      'xenia.host': r.host,
      'xenia.stake': r.stake,
      'xenia.premiumStatus': r.premiumStatus,
      'xenia.backingId': r.backingId,
    };

    console.log(`\n→ ${name}`);

    for (const key of BACKING_TEXT_KEYS) {
      const setHash = await walletClient.writeContract({
        address: resolver,
        abi: permissionedResolverAbi,
        functionName: 'setText',
        args: [node, key, values[key]],
        account,
        chain: walletClient.chain,
      });
      await publicClient.waitForTransactionReceipt({ hash: setHash });
      console.log(`  setText ${key}=${values[key]} (${setHash})`);

      const authHash = await walletClient.writeContract({
        address: resolver,
        abi: permissionedResolverAbi,
        functionName: 'authorizeTextRoles',
        args: [toName, key, host, true],
        account,
        chain: walletClient.chain,
      });
      await publicClient.waitForTransactionReceipt({ hash: authHash });
      console.log(`  authorizeTextRoles → host ${host} for ${key}`);
    }
  }

  console.log('\nEAC grants complete. Run: pnpm ens:eac');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
