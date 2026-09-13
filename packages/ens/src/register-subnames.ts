/**
 * Register agent identities as subnames under the owned parent (e.g. agent-a.xenia.eth).
 *
 * ENSv2 UserRegistry.register(label, owner, subregistry, resolver, roleBitmap, expiry)
 * — expiry is an absolute unix timestamp, not a duration.
 */
import { zeroAddress } from 'viem';
import {
  getClients,
  agentSubname,
  requireEnvAddress,
  permissionedRegistryAbi,
  SUBNAME_OWNER_ROLE_BITMAP,
} from './config.js';

const LABELS = [
  { label: 'agent-a', env: 'AGENT_A_ADDRESS' },
  { label: 'agent-b', env: 'AGENT_B_ADDRESS' },
  { label: 'agent-c', env: 'AGENT_C_ADDRESS' },
] as const;

async function main() {
  const { walletClient, account, publicClient } = getClients();
  const registry = requireEnvAddress('ENS_REGISTRY_ADDRESS');
  const resolver = requireEnvAddress('ENS_RESOLVER_ADDRESS');
  const durationSec = BigInt(process.env.ENS_REGISTRATION_DURATION ?? `${365 * 24 * 60 * 60}`);
  const latest = await publicClient.getBlock();
  const expiry = BigInt(latest.timestamp) + durationSec;

  for (const { label, env } of LABELS) {
    const owner = process.env[env];
    if (!owner) {
      console.warn(`skip ${label}: ${env} not set`);
      continue;
    }

    console.log(`Registering ${agentSubname(label)} → owner ${owner}`);
    console.log(`  resolver=${resolver} expiry=${expiry}`);
    const hash = await walletClient.writeContract({
      address: registry,
      abi: permissionedRegistryAbi,
      functionName: 'register',
      args: [
        label,
        owner as `0x${string}`,
        zeroAddress, // no nested subregistry
        resolver,
        SUBNAME_OWNER_ROLE_BITMAP,
        expiry,
      ],
      account,
      chain: walletClient.chain,
    });
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    console.log(`  tx: ${hash} status=${receipt.status}`);
  }

  console.log('\nDone. Next: pnpm ens:backing (after backings exist)');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
