'use client';

import Link from 'next/link';
import type { AgentSummary } from '@/lib/types';
import { agentDisplayName, agentPath } from '@/lib/agent-path';
import { shortAddr } from '@/lib/format';

function statusLabel(agent: AgentSummary) {
  const slashed = Number(agent.slashesCount || 0) > 0;
  if (slashed) return { text: 'Lost', className: 'text-red' };
  if (agent.inGoodStanding)
    return { text: 'In good standing', className: 'text-ink' };
  return { text: 'Under review', className: 'text-amber' };
}

export function LedgerTable({
  agents,
  compact = false,
}: {
  agents: AgentSummary[];
  compact?: boolean;
}) {
  if (agents.length === 0) {
    return (
      <p className="x-body py-8 text-center">
        No agents indexed yet.{' '}
        <Link href="/agents/new" className="text-ink underline underline-offset-2">
          Register the first one
        </Link>
        .
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="x-ledger">
        <thead>
          <tr>
            <th>Rank</th>
            <th>Agent</th>
            <th>Score</th>
            {!compact && <th>Premiums</th>}
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {agents.map((agent, i) => {
            const label = agentDisplayName(agent);
            const status = statusLabel(agent);
            const slashed = Number(agent.slashesCount || 0) > 0;
            return (
              <tr key={agent.id}>
                <td className="font-mono text-[11px] text-muted">
                  {String(i + 1).padStart(2, '0')}
                </td>
                <td>
                  <Link
                    href={agentPath(agent)}
                    className="block min-w-[140px]"
                  >
                    <span className="font-medium text-ink">
                      {agent.ensName ? label : shortAddr(agent.id)}
                    </span>
                    <span className="mt-0.5 block font-mono text-[10px] text-muted">
                      {agent.ensName || shortAddr(agent.id)}
                    </span>
                  </Link>
                </td>
                <td>
                  <span
                    className={`font-semibold tabular-nums ${
                      slashed ? 'text-red' : 'text-ink'
                    }`}
                  >
                    {agent.standingScore}
                  </span>
                </td>
                {!compact && (
                  <td className="tabular-nums text-muted">
                    {agent.premiumsPaidCount ?? '0'}
                  </td>
                )}
                <td className={`text-right ${status.className}`}>
                  {status.text}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
