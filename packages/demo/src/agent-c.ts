/**
 * Agent C — checker: queries check_agent_standing on A and B before deciding to transact.
 * Payoff shot for the demo video — standing score is load-bearing.
 */
import { log, checkStandingViaMcpShape, walletFromEnv, X402_URL } from './lib.js';

export async function runAgentC(agentA?: string, agentB?: string) {
  const { account: checker } = walletFromEnv('AGENT_C_PRIVATE_KEY');
  const a = agentA ?? process.env.AGENT_A_ADDRESS ?? '';
  const b = agentB ?? process.env.AGENT_B_ADDRESS ?? '';

  if (!a || !b) throw new Error('AGENT_A_ADDRESS and AGENT_B_ADDRESS required');

  log('C0', `Checker agent ${checker.address} evaluating counterparties`);

  log('C1', `Standing for Agent A (${a}) via subgraph/MCP shape`);
  const standingA = await checkStandingViaMcpShape(a);
  console.error(JSON.stringify(standingA, null, 2));

  log('C2', `Standing for Agent B (${b}) via subgraph/MCP shape`);
  const standingB = await checkStandingViaMcpShape(b);
  console.error(JSON.stringify(standingB, null, 2));

  // Also hit x402-gated endpoint (will 402 without payment — still demo-visible)
  log('C3', 'x402-gated /xenia/check for Agent A (expect 402 without PAYMENT-SIGNATURE)');
  try {
    const res = await fetch(`${X402_URL}/xenia/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentId: a }),
    });
    console.error(`  HTTP ${res.status}`, await res.json());
  } catch (e) {
    log('C3', `x402 unreachable: ${(e as Error).message}`);
  }

  const scoreA =
    (standingA as { data?: { agent?: { standingScore?: number; inGoodStanding?: boolean } } })
      ?.data?.agent?.standingScore ??
    ((standingA as { inGoodStanding?: boolean }).inGoodStanding ? 60 : 0);
  const scoreB =
    (standingB as { data?: { agent?: { standingScore?: number; inGoodStanding?: boolean } } })
      ?.data?.agent?.standingScore ??
    ((standingB as { inGoodStanding?: boolean }).inGoodStanding ? 60 : 0);

  const decide = (label: string, score: number) => {
    const ok = score >= 50;
    log('C✓', `${label}: standingScore=${score} → ${ok ? 'TRANSACT' : 'REFUSE'}`);
    return ok;
  };

  const takeA = decide('Agent A (legit)', Number(scoreA));
  const takeB = decide('Agent B (defaulter)', Number(scoreB));

  return { takeA, takeB, scoreA, scoreB };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runAgentC().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
