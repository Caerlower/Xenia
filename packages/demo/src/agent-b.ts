/**
 * Agent B — gets backed, then defaults: reportDefault → wait window → resolveDispute(true)
 * Shows host stake leaving wallet and landing with the victim.
 */
import { formatEther, namehash } from 'viem';
import {
  DISPUTE_WINDOW_MS,
  log,
  publicClient,
  sleep,
  walletFromEnv,
  writeRegistry,
} from './lib.js';

export async function runAgentB(opts?: {
  ensName?: string;
  stakeWei?: bigint;
  premiumWei?: bigint;
  skipRegister?: boolean;
}) {
  const ensName = opts?.ensName ?? process.env.AGENT_B_ENS ?? 'agent-b.xenia.eth';
  const stake = opts?.stakeWei ?? BigInt(process.env.STAKE_WEI ?? '1000000000000000000');
  const premium = opts?.premiumWei ?? BigInt(process.env.PREMIUM_WEI ?? '10000000000000000');

  const { account: agent } = walletFromEnv('AGENT_B_PRIVATE_KEY');
  const { account: host } = walletFromEnv('HOST_PRIVATE_KEY');
  const { account: victim } = walletFromEnv('VICTIM_PRIVATE_KEY');

  if (!opts?.skipRegister) {
    log('B1', `Register agent B ${agent.address} as ${ensName}`);
    await writeRegistry(agent, 'registerAgent', [namehash(ensName)]);
  }

  const hostBefore = await publicClient.getBalance({ address: host.address });
  log('B2', `Host balance before stake: ${formatEther(hostBefore)} ETH`);

  log('B3', 'Host creates backing for Agent B');
  const { hash: backTx } = await writeRegistry(
    host,
    'createBacking',
    [agent.address, stake, premium],
    stake,
  );
  log('B3', `BackingCreated tx ${backTx}`);

  const hostAfterStake = await publicClient.getBalance({ address: host.address });
  log('B3', `Host balance after stake: ${formatEther(hostAfterStake)} ETH`);

  const backingId = process.env.AGENT_B_BACKING_ID as `0x${string}` | undefined;
  if (!backingId) {
    log('B!', 'Set AGENT_B_BACKING_ID from BackingCreated event to continue slash path');
    return { agent: agent.address, backTx };
  }

  log('B4', `Agent B defaults on task — victim ${victim.address} reports default`);
  await writeRegistry(victim, 'reportDefault', [backingId, victim.address]);

  const waitMs = DISPUTE_WINDOW_MS + 2_000;
  log('B5', `Waiting dispute window (~${Math.round(waitMs / 1000)}s)…`);
  await sleep(waitMs);

  const victimBefore = await publicClient.getBalance({ address: victim.address });
  log('B6', `Victim balance before slash: ${formatEther(victimBefore)} ETH`);

  // Anyone can resolve after window for the demo
  await writeRegistry(victim, 'resolveDispute', [backingId, true]);

  const victimAfter = await publicClient.getBalance({ address: victim.address });
  const hostFinal = await publicClient.getBalance({ address: host.address });

  log('B✓', `SLASHED — victim now ${formatEther(victimAfter)} ETH (was ${formatEther(victimBefore)})`);
  log('B✓', `Host final balance ${formatEther(hostFinal)} ETH — stake left the host wallet`);

  return { agent: agent.address, victim: victim.address, backingId };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runAgentB().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
