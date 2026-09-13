/**
 * Programmatic A → B → C orchestrator for CLI + demo-site "Run" button.
 * Each run mints fresh agent wallets + unique ENS namehashes.
 */
import {
  decodeEventLog,
  formatEther,
  namehash,
  type Hex,
  type Log,
} from 'viem';
import { XENIA_REGISTRY_ABI } from '@xenia/shared';
import {
  checkStandingViaMcpShape,
  DISPUTE_WINDOW_MS,
  freshWallet,
  fundAddress,
  funderFromEnv,
  log,
  publicClient,
  REGISTRY,
  sleep,
  victimFromEnv,
  writeRegistry,
} from './lib.js';

export type DemoStepId =
  | 'boot'
  | 'register'
  | 'stake'
  | 'premium'
  | 'default'
  | 'waiting'
  | 'slash'
  | 'index'
  | 'verdict'
  | 'done'
  | 'error';

export type DemoAgentRef = {
  id: string;
  ensName: string;
};

export type DemoTxRef = {
  label: string;
  hash: string;
};

export type DemoEvent = {
  step: DemoStepId;
  message: string;
  txHash?: string;
  txLabel?: string;
  /** Full ledger of txs for this run (sent on done / error for verification). */
  txs?: DemoTxRef[];
  scoreA?: number;
  scoreB?: number;
  takeA?: boolean;
  takeB?: boolean;
  agentA?: DemoAgentRef;
  agentB?: DemoAgentRef;
};

export type DemoEmit = (event: DemoEvent) => void;

function extractBackingId(logs: Log[]): Hex | null {
  for (const l of logs) {
    try {
      const decoded = decodeEventLog({
        abi: XENIA_REGISTRY_ABI,
        data: l.data,
        topics: l.topics,
      });
      if (decoded.eventName === 'BackingCreated') {
        return (decoded.args as { backingId: Hex }).backingId;
      }
    } catch {
      /* not our event */
    }
  }
  return null;
}

function runLabel() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

function standingScoreFromPayload(standing: unknown): number {
  const s = standing as {
    data?: { agent?: { standingScore?: number; inGoodStanding?: boolean } };
    inGoodStanding?: boolean;
  };
  if (typeof s.data?.agent?.standingScore === 'number') {
    return s.data.agent.standingScore;
  }
  if (typeof s.inGoodStanding === 'boolean') {
    return s.inGoodStanding ? 60 : 0;
  }
  return 0;
}

export async function runOnchainDemo(emit: DemoEmit = () => {}) {
  if (!REGISTRY) throw new Error('XENIA_REGISTRY_ADDRESS required');

  const stake = BigInt(process.env.STAKE_WEI ?? '500000000000000'); // 0.0005 ETH
  const premium = BigInt(process.env.PREMIUM_WEI ?? '50000000000000'); // 0.00005 ETH
  // Gas pad must cover register + payPremium (or register alone for B) on Sepolia
  const gasPad = BigInt(process.env.DEMO_GAS_WEI ?? '1200000000000000'); // 0.0012 ETH
  const feeBuffer = BigInt(process.env.DEMO_FEE_BUFFER_WEI ?? '1000000000000000'); // ~0.001
  // needed ≈ 2×stake + 2×gasPad + premium + topUp + feeBuffer ≈ 0.005 ETH
  const premiumTopUp = gasPad; // second fill so payPremium has gas after register

  const id = runLabel();
  const ensA = `a-${id}.xenia.eth`;
  const ensB = `b-${id}.xenia.eth`;

  const { account: host, envKey: funderKey } = funderFromEnv();
  const { account: victim } = victimFromEnv();
  const { account: agentA } = freshWallet();
  const { account: agentB } = freshWallet();

  const refA: DemoAgentRef = { id: agentA.address.toLowerCase(), ensName: ensA };
  const refB: DemoAgentRef = { id: agentB.address.toLowerCase(), ensName: ensB };
  const txs: DemoTxRef[] = [];
  const pushTx = (label: string, hash: string) => {
    txs.push({ label, hash });
    return hash;
  };

  const needed = stake * 2n + gasPad * 3n + premium * 2n + feeBuffer;
  const hostBal = await publicClient.getBalance({ address: host.address });
  if (hostBal < needed) {
    throw new Error(
      `Funder ${host.address} has ${formatEther(hostBal)} ETH but this run needs ~${formatEther(needed)} ETH (2× stake + 3× gas pad + premiums + fees). Top up Sepolia ETH and retry.`,
    );
  }

  emit({
    step: 'boot',
    message: `Fresh run ${id}: funding new agents from ${funderKey}`,
    agentA: refA,
    agentB: refB,
  });

  emit({
    step: 'register',
    message: `Funding ${ensA} from your key, then registering`,
    agentA: refA,
    agentB: refB,
  });
  log('FUND', `Sending gas+premium to Agent A from ${funderKey} (${host.address})`);
  const fundATx = pushTx(
    'Fund Agent A',
    await fundAddress(host, agentA.address, gasPad + premium),
  );
  emit({
    step: 'register',
    message: `Funded ${ensA}`,
    txHash: fundATx,
    txLabel: 'Fund Agent A',
    agentA: refA,
    agentB: refB,
  });
  const { hash: regATx } = await writeRegistry(agentA, 'registerAgent', [
    namehash(ensA),
  ]);
  pushTx(`Register ${ensA}`, regATx);
  emit({
    step: 'register',
    message: `Registered ${ensA}`,
    txHash: regATx,
    txLabel: `Register ${ensA}`,
    agentA: refA,
    agentB: refB,
  });

  emit({
    step: 'stake',
    message: `Host stakes ${formatEther(stake)} ETH behind ${ensA}`,
    agentA: refA,
    agentB: refB,
  });
  const { hash: aBackTx, receipt: aBackReceipt } = await writeRegistry(
    host,
    'createBacking',
    [agentA.address, stake, premium],
    stake,
  );
  pushTx(`Stake behind ${ensA}`, aBackTx);
  emit({
    step: 'stake',
    message: `${ensA} backing created`,
    txHash: aBackTx,
    txLabel: `Stake behind ${ensA}`,
    agentA: refA,
    agentB: refB,
  });
  const aBackingId = extractBackingId(aBackReceipt.logs);
  if (!aBackingId) throw new Error('Could not parse Agent A BackingCreated');

  emit({
    step: 'premium',
    message: `${ensA} pays trust fee`,
    agentA: refA,
    agentB: refB,
  });
  log('FUND', `Top-up ${ensA} for trust fee + gas`);
  const topUpATx = pushTx(
    'Top-up Agent A',
    await fundAddress(host, agentA.address, premiumTopUp + premium),
  );
  emit({
    step: 'premium',
    message: `Topped up ${ensA} for trust fee`,
    txHash: topUpATx,
    txLabel: 'Top-up Agent A',
    agentA: refA,
    agentB: refB,
  });
  const { hash: premTx } = await writeRegistry(
    agentA,
    'payPremium',
    [aBackingId],
    premium,
  );
  pushTx(`Trust fee ${ensA}`, premTx);
  emit({
    step: 'premium',
    message: 'Trust fee settled',
    txHash: premTx,
    txLabel: `Trust fee ${ensA}`,
    agentA: refA,
    agentB: refB,
  });

  emit({
    step: 'default',
    message: `Funding ${ensB} from your key, then default path`,
    agentA: refA,
    agentB: refB,
  });
  log('FUND', `Sending gas to Agent B from ${funderKey} (${host.address})`);
  const fundBTx = pushTx(
    'Fund Agent B',
    await fundAddress(host, agentB.address, gasPad),
  );
  emit({
    step: 'default',
    message: `Funded ${ensB}`,
    txHash: fundBTx,
    txLabel: 'Fund Agent B',
    agentA: refA,
    agentB: refB,
  });
  const { hash: regBTx } = await writeRegistry(agentB, 'registerAgent', [
    namehash(ensB),
  ]);
  pushTx(`Register ${ensB}`, regBTx);
  log('B1', `Registered ${ensB} tx=${regBTx}`);
  emit({
    step: 'default',
    message: `Registered ${ensB}. Host staking ${formatEther(stake)} ETH`,
    txHash: regBTx,
    txLabel: `Register ${ensB}`,
    agentA: refA,
    agentB: refB,
  });

  const { hash: bBackTx, receipt: bBackReceipt } = await writeRegistry(
    host,
    'createBacking',
    [agentB.address, stake, premium],
    stake,
  );
  pushTx(`Stake behind ${ensB}`, bBackTx);
  emit({
    step: 'default',
    message: `${ensB} backing created`,
    txHash: bBackTx,
    txLabel: `Stake behind ${ensB}`,
    agentA: refA,
    agentB: refB,
  });
  const bBackingId = extractBackingId(bBackReceipt.logs);
  if (!bBackingId) throw new Error('Could not parse Agent B BackingCreated');

  const { hash: reportTx } = await writeRegistry(victim, 'reportDefault', [
    bBackingId,
    victim.address,
  ]);
  pushTx(`Report default ${ensB}`, reportTx);
  emit({
    step: 'default',
    message: `${ensB} default reported. Dispute window open`,
    txHash: reportTx,
    txLabel: `Report default ${ensB}`,
    agentA: refA,
    agentB: refB,
  });

  const waitMs = DISPUTE_WINDOW_MS + 2_000;
  emit({
    step: 'waiting',
    message: `Waiting dispute window (~${Math.round(waitMs / 1000)}s)`,
    agentA: refA,
    agentB: refB,
  });
  await sleep(waitMs);

  emit({
    step: 'slash',
    message: 'Resolving dispute. Stake to victim',
    agentA: refA,
    agentB: refB,
  });
  const before = await publicClient.getBalance({ address: victim.address });
  const { hash: slashTx } = await writeRegistry(victim, 'resolveDispute', [
    bBackingId,
    true,
  ]);
  pushTx(`Slash / resolve ${ensB}`, slashTx);
  const after = await publicClient.getBalance({ address: victim.address });
  emit({
    step: 'slash',
    message: `Victim received ${formatEther(after - before)} ETH`,
    txHash: slashTx,
    txLabel: `Slash / resolve ${ensB}`,
    agentA: refA,
    agentB: refB,
  });

  emit({
    step: 'index',
    message: 'Waiting for subgraph index…',
    agentA: refA,
    agentB: refB,
  });
  await sleep(4_000);

  emit({
    step: 'verdict',
    message: "Checker reads standing for this run's agents",
    agentA: refA,
    agentB: refB,
  });
  const standingA = await checkStandingViaMcpShape(agentA.address);
  const standingB = await checkStandingViaMcpShape(agentB.address);
  const scoreA = standingScoreFromPayload(standingA);
  const scoreB = standingScoreFromPayload(standingB);
  const takeA = scoreA >= 50;
  const takeB = scoreB >= 50;

  emit({
    step: 'verdict',
    message: `A ${takeA ? 'TRANSACT' : 'REFUSE'} (${scoreA}) · B ${
      takeB ? 'TRANSACT' : 'REFUSE'
    } (${scoreB})`,
    scoreA,
    scoreB,
    takeA,
    takeB,
    txs,
    agentA: refA,
    agentB: refB,
  });

  emit({
    step: 'done',
    message: `On-chain demo complete · ${txs.length} txs · ${ensA} / ${ensB}`,
    scoreA,
    scoreB,
    takeA,
    takeB,
    txs,
    txHash: slashTx,
    txLabel: `Slash / resolve ${ensB}`,
    agentA: refA,
    agentB: refB,
  });

  return { takeA, takeB, scoreA, scoreB, agentA: refA, agentB: refB, txs };
}
