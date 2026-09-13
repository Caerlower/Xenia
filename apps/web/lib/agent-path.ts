import type { AgentSummary } from '@/lib/types';

/** Stable profile path: ENS label when present, otherwise full address. */
export function agentPath(agent: Pick<AgentSummary, 'id' | 'ensName'>) {
  if (agent.ensName) {
    const label = agent.ensName.replace(/\.xenia\.eth$/i, '').trim();
    if (label && !label.includes('…') && !label.includes('...')) {
      return `/agents/${encodeURIComponent(label)}`;
    }
  }
  return `/agents/${encodeURIComponent(agent.id.toLowerCase())}`;
}

export function agentDisplayName(agent: Pick<AgentSummary, 'id' | 'ensName'>) {
  if (agent.ensName) {
    return agent.ensName.replace(/\.xenia\.eth$/i, '');
  }
  return agent.id;
}
