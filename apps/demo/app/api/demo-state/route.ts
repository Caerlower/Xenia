import { namehash } from 'viem';
import type { DemoAgent } from '@/lib/demo';
import { GQL, subgraphQuery } from '@/lib/subgraph';

const KNOWN = {
  a: {
    label: 'agent-a.xenia.eth',
    node: namehash('agent-a.xenia.eth'),
    fallbackId: '0x6c0d48713602d11355dcf1825eb2e33cf5e2007a',
  },
  b: {
    label: 'agent-b.xenia.eth',
    node: namehash('agent-b.xenia.eth'),
    fallbackId: '0xa78f11b25a0b62b5b71d4d00b941130976462495',
  },
} as const;

async function loadByNodeOrId(
  node: string,
  fallbackId: string,
  label: string,
): Promise<DemoAgent | null> {
  const fields = `${GQL.agentCore} ensNode`;
  const byNode = await subgraphQuery<{ agents: DemoAgent[] }>(
    `query($ensNode: Bytes!) {
      agents(where: { ensNode: $ensNode }, first: 1) { ${fields} }
    }`,
    { ensNode: node },
  );
  let agent = byNode.data?.agents?.[0] ?? null;
  if (!agent) {
    const byId = await subgraphQuery<{ agent: DemoAgent | null }>(
      `query($id: ID!) { agent(id: $id) { ${fields} } }`,
      { id: fallbackId },
    );
    agent = byId.data?.agent ?? null;
  }
  if (!agent) return null;
  return {
    ...agent,
    ensName: agent.ensName || label,
  };
}

export async function GET() {
  const [agentA, agentB, metrics] = await Promise.all([
    loadByNodeOrId(KNOWN.a.node, KNOWN.a.fallbackId, KNOWN.a.label),
    loadByNodeOrId(KNOWN.b.node, KNOWN.b.fallbackId, KNOWN.b.label),
    subgraphQuery<{
      agents: { id: string }[];
      backings: { stakeAmount: string; status: string }[];
    }>(`{
      agents(first: 100) { id }
      backings(first: 100) { stakeAmount status }
    }`),
  ]);

  const backings = metrics.data?.backings ?? [];
  const locked = backings
    .filter((b) => b.status === 'Active')
    .reduce((sum, b) => sum + BigInt(b.stakeAmount || '0'), 0n);
  const slashes = backings.filter((b) => b.status === 'Slashed').length;

  return Response.json({
    live: Boolean(agentA || agentB),
    network: {
      agents: metrics.data?.agents?.length ?? 0,
      slashes,
      lockedWei: locked.toString(),
    },
    agentA,
    agentB,
    story: {
      title: 'Live Sepolia replay',
      summary:
        'Agent A keeps coverage and stays tradable. Agent B defaults, gets slashed, and is refused.',
    },
  });
}
