import { namehash } from 'viem';
import { subgraphQuery } from '@/lib/subgraph';
import type { ActiveBacking, AgentProfile, PremiumPayment } from '@/lib/types';

export type RawBacking = ActiveBacking & { premiums?: PremiumPayment[] };
export type RawAgent = Omit<AgentProfile, 'premiumPayments' | 'backings'> & {
  backings?: RawBacking[];
  ensNode?: string | null;
};

/** Demo / known labels — subgraph only stores ensNode (namehash), not the string. */
const KNOWN_ENS_BY_NODE: Record<string, string> = {
  [namehash('agent-a.xenia.eth')]: 'agent-a.xenia.eth',
  [namehash('agent-b.xenia.eth')]: 'agent-b.xenia.eth',
  [namehash('agent-c.xenia.eth')]: 'agent-c.xenia.eth',
};

export const AGENT_PROFILE_FIELDS = `
  id
  ensName
  ensNode
  standingScore
  inGoodStanding
  premiumsPaidCount
  defaultsCount
  slashesCount
  backings(first: 10, orderBy: createdAt, orderDirection: desc) {
    id
    host
    stakeAmount
    premiumRate
    status
    premiums(first: 20, orderBy: timestamp, orderDirection: desc) {
      amount
      timestamp
    }
  }
`;

export const AGENT_SUMMARY_FIELDS = `
  id
  ensName
  ensNode
  standingScore
  inGoodStanding
  premiumsPaidCount
  defaultsCount
  slashesCount
`;

export function normalizeAgentQuery(raw: string) {
  const v = decodeURIComponent(raw).trim().toLowerCase();
  if (!v) return '';
  if (v.startsWith('0x') || v.endsWith('.xenia.eth') || v.endsWith('.eth')) {
    return v;
  }
  return `${v}.xenia.eth`;
}

export function ensCandidatesForQuery(raw: string): string[] {
  const lower = decodeURIComponent(raw).trim().toLowerCase();
  if (!lower || lower.startsWith('0x')) return [];
  if (lower.includes('.')) return [lower];
  return [`${lower}.xenia.eth`, lower];
}

export function hydrateEnsName<T extends { ensName?: string | null; ensNode?: string | null }>(
  agent: T,
  preferredName?: string | null,
): T {
  if (agent.ensName) return agent;
  const fromNode = agent.ensNode
    ? KNOWN_ENS_BY_NODE[agent.ensNode.toLowerCase()]
    : undefined;
  const fromPreferred =
    preferredName && !preferredName.startsWith('0x')
      ? preferredName.includes('.')
        ? preferredName
        : `${preferredName}.xenia.eth`
      : undefined;
  const ensName = fromPreferred || fromNode || null;
  return ensName ? { ...agent, ensName } : agent;
}

export function shapeAgentProfile(
  raw: RawAgent | null,
  preferredName?: string | null,
): AgentProfile | null {
  if (!raw) return null;
  const hydrated = hydrateEnsName(raw, preferredName);
  const premiumPayments: PremiumPayment[] = [];
  for (const b of hydrated.backings || []) {
    for (const p of b.premiums || []) {
      premiumPayments.push({
        amount: p.amount,
        timestamp: p.timestamp,
        backingId: b.id,
      });
    }
  }
  premiumPayments.sort((a, b) => Number(b.timestamp) - Number(a.timestamp));
  return {
    id: hydrated.id,
    ensName: hydrated.ensName ?? null,
    standingScore: hydrated.standingScore,
    inGoodStanding: hydrated.inGoodStanding,
    premiumsPaidCount: hydrated.premiumsPaidCount,
    defaultsCount: hydrated.defaultsCount,
    slashesCount: hydrated.slashesCount,
    backings: (hydrated.backings || []).map((b) => ({
      id: b.id,
      host: b.host,
      stakeAmount: b.stakeAmount,
      premiumRate: b.premiumRate,
      status: b.status,
    })),
    premiumPayments: premiumPayments.slice(0, 20),
  };
}

async function findByEnsName(ensName: string, fields: string) {
  const { data } = await subgraphQuery<{ agents: RawAgent[] }>(
    `query($ensName: String!) {
      agents(where: { ensName: $ensName }, first: 1) { ${fields} }
    }`,
    { ensName },
  );
  return data?.agents?.[0] ?? null;
}

async function findByEnsNode(ensName: string, fields: string) {
  let node: string;
  try {
    node = namehash(ensName);
  } catch {
    return null;
  }
  const { data } = await subgraphQuery<{ agents: RawAgent[] }>(
    `query($ensNode: Bytes!) {
      agents(where: { ensNode: $ensNode }, first: 1) { ${fields} }
    }`,
    { ensNode: node },
  );
  return data?.agents?.[0] ?? null;
}

/** Resolve an agent by wallet, ENS string, or truncated address. */
export async function resolveRawAgent(
  query: string,
  fields: string = AGENT_PROFILE_FIELDS,
): Promise<{ agent: RawAgent | null; matchedName: string | null }> {
  const lower = decodeURIComponent(query).trim().toLowerCase();
  if (!lower) return { agent: null, matchedName: null };

  if (lower.startsWith('0x') && lower.length === 42) {
    const { data } = await subgraphQuery<{ agent: RawAgent | null }>(
      `query($id: ID!) { agent(id: $id) { ${fields} } }`,
      { id: lower },
    );
    return { agent: data?.agent ?? null, matchedName: null };
  }

  if (
    lower.startsWith('0x') &&
    (lower.includes('…') || lower.includes('...') || lower.length < 42)
  ) {
    const parts = lower.split(/…|\.\.\./);
    const prefix = (parts[0] || lower.slice(0, 6)).toLowerCase();
    const suffix = (parts[1] || '').toLowerCase();
    const { data } = await subgraphQuery<{ agents: RawAgent[] }>(
      `query { agents(first: 200) { ${fields} } }`,
    );
    const matches = (data?.agents ?? []).filter((a) => {
      const id = a.id.toLowerCase();
      return id.startsWith(prefix) && (!suffix || id.endsWith(suffix));
    });
    return {
      agent: matches.length === 1 ? matches[0] : null,
      matchedName: null,
    };
  }

  for (const ensName of ensCandidatesForQuery(lower)) {
    let raw = await findByEnsName(ensName, fields);
    if (!raw && ensName.includes('.')) {
      // Registry only emits ensNode (namehash). ensName is usually null in the subgraph.
      raw = await findByEnsNode(ensName, fields);
    }
    if (raw) return { agent: raw, matchedName: ensName };
  }

  return { agent: null, matchedName: null };
}

export async function resolveAgentProfile(
  query: string,
): Promise<AgentProfile | null> {
  const { agent, matchedName } = await resolveRawAgent(
    query,
    AGENT_PROFILE_FIELDS,
  );
  return shapeAgentProfile(agent, matchedName);
}
