/**
 * Smoke-test x402 gate: unpaid POST /xenia/check must return 402 with accepts[].
 */
import { loadRootEnv } from '@xenia/config';

loadRootEnv(import.meta.url);

const base = process.env.X402_SERVICE_URL ?? 'http://localhost:4021';
const agentId = process.env.AGENT_A_ADDRESS;

async function main() {
  if (!agentId) throw new Error('AGENT_A_ADDRESS required');

  const health = await fetch(`${base}/health`);
  if (!health.ok) throw new Error(`API health failed: ${health.status}`);
  console.log('health', await health.json());

  const res = await fetch(`${base}/xenia/check`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ agentId }),
  });

  const body = await res.json();
  console.log('check status', res.status);
  console.log(JSON.stringify(body, null, 2));

  if (res.status !== 402) {
    throw new Error(`Expected HTTP 402 Payment Required, got ${res.status}`);
  }
  if (!body.accepts?.length && !body.x402Version) {
    throw new Error('402 body missing x402 accepts / version');
  }

  console.log('\n✓ x402 gate OK — payment required before standing check');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
