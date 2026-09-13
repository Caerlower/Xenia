/**
 * Agent A — legitimate guest: register → get backed → pay premium → complete paid task.
 */
import { namehash } from 'viem';
import { log, walletFromEnv, writeRegistry, X402_URL } from './lib.js';

export async function runAgentA(opts?: { ensName?: string; stakeWei?: bigint; premiumWei?: bigint }) {
  const ensName = opts?.ensName ?? process.env.AGENT_A_ENS ?? 'agent-a.xenia.eth';
  const stake = opts?.stakeWei ?? BigInt(process.env.STAKE_WEI ?? '1000000000000000000');
  const premium = opts?.premiumWei ?? BigInt(process.env.PREMIUM_WEI ?? '10000000000000000');

  const { account: agent } = walletFromEnv('AGENT_A_PRIVATE_KEY');
  const { account: host } = walletFromEnv('HOST_PRIVATE_KEY');

  log('A1', `Register agent A ${agent.address} as ${ensName}`);
  await writeRegistry(agent, 'registerAgent', [namehash(ensName)]);

  log('A2', `Host ${host.address} creates backing (stake=${stake}, premium=${premium})`);
  const { hash: backTx } = await writeRegistry(
    host,
    'createBacking',
    [agent.address, stake, premium],
    stake,
  );
  log('A2', `BackingCreated tx ${backTx}`);

  // Pull backingId from env if set by orchestrator; otherwise caller inspects logs.
  const backingId = process.env.AGENT_A_BACKING_ID as `0x${string}` | undefined;
  if (backingId) {
    log('A3', `Pay premium on ${backingId}`);
    await writeRegistry(agent, 'payPremium', [backingId], premium);
  } else {
    log('A3', 'Set AGENT_A_BACKING_ID to pay premium (or use run-demo orchestrator)');
  }

  log('A4', 'Complete paid task via x402 check (self-standing)');
  try {
    const res = await fetch(`${X402_URL}/xenia/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentId: agent.address }),
    });
    const body = await res.json();
    log('A4', `x402 check HTTP ${res.status}: ${JSON.stringify(body).slice(0, 200)}`);
  } catch (e) {
    log('A4', `x402 service unreachable (${(e as Error).message}) — start x402-service for full demo`);
  }

  log('A✓', 'Agent A path complete — legitimate standing');
  return { agent: agent.address, host: host.address, backTx };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runAgentA().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
