import {
  AGENT_SUMMARY_FIELDS,
  hydrateEnsName,
} from '@/lib/resolve-agent';
import { subgraphQuery } from '@/lib/subgraph';
import type { AgentSummary } from '@/lib/types';

const AGENTS_QUERY = `
  query Agents($first: Int!) {
    agents(first: $first, orderBy: standingScore, orderDirection: desc) {
      ${AGENT_SUMMARY_FIELDS}
    }
  }
`;

type AgentRow = AgentSummary & { ensNode?: string | null };

export async function fetchAgents(first = 100): Promise<AgentSummary[]> {
  const { data } = await subgraphQuery<{ agents: AgentRow[] }>(AGENTS_QUERY, {
    first,
  });
  return (data?.agents ?? []).map((agent) => {
    const hydrated = hydrateEnsName(agent);
    return {
      id: hydrated.id,
      ensName: hydrated.ensName ?? null,
      standingScore: hydrated.standingScore,
      inGoodStanding: hydrated.inGoodStanding,
      premiumsPaidCount: hydrated.premiumsPaidCount,
      defaultsCount: hydrated.defaultsCount,
      slashesCount: hydrated.slashesCount,
    };
  });
}
