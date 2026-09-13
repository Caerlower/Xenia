/**
 * NDJSON event stream for the demo-site Run button (spawned as a child process).
 */
import { runOnchainDemo } from './orchestrate.js';

function emit(event: Record<string, unknown>) {
  process.stdout.write(`${JSON.stringify(event)}\n`);
}

emit({ step: 'boot', message: 'On-chain demo started (Sepolia). Gas will be spent.' });

runOnchainDemo((event) => {
  emit(event);
})
  .then((decision) => {
    emit({
      step: 'done',
      message: `On-chain demo complete · ${decision.txs.length} txs · ${decision.agentA.ensName} / ${decision.agentB.ensName}`,
      scoreA: Number(decision.scoreA),
      scoreB: Number(decision.scoreB),
      takeA: decision.takeA,
      takeB: decision.takeB,
      agentA: decision.agentA,
      agentB: decision.agentB,
      txs: decision.txs,
      txHash: decision.txs.at(-1)?.hash,
      txLabel: decision.txs.at(-1)?.label,
    });
    process.exit(0);
  })
  .catch((err: unknown) => {
    emit({
      step: 'error',
      message: err instanceof Error ? err.message : String(err),
    });
    process.exit(1);
  });
