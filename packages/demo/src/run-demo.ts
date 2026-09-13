/**
 * Orchestrates the A → B → C demo sequence for the video / dashboard "Run demo" button.
 */
import { runOnchainDemo } from './orchestrate.js';

async function main() {
  console.log('══════════════════════════════════════════');
  console.log('  XENIA DEMO — guest-friendship for agents');
  console.log('══════════════════════════════════════════');

  const decision = await runOnchainDemo((e) => {
    console.log(`\n[${e.step}] ${e.message}${e.txHash ? `  tx=${e.txHash}` : ''}`);
  });

  console.log('\n══════════════════════════════════════════');
  console.log('  DEMO COMPLETE');
  console.log(`  A ${decision.agentA.ensName} (${decision.agentA.id})`);
  console.log(`  B ${decision.agentB.ensName} (${decision.agentB.id})`);
  console.log(`  C→A transact: ${decision.takeA} (score ${decision.scoreA})`);
  console.log(`  C→B refuse:   ${!decision.takeB} (score ${decision.scoreB})`);
  console.log('══════════════════════════════════════════\n');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
