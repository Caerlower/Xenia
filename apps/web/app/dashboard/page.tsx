'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import type { AgentSummary } from '@/lib/types';
import { agentDisplayName, agentPath } from '@/lib/agent-path';
import { shortAddr } from '@/lib/format';

export default function DashboardPage() {
  const { address, isConnected } = useAccount();
  const [agents, setAgents] = useState<AgentSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/agents');
        const json = await res.json();
        if (!cancelled) setAgents(json.agents ?? []);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const mine = address
    ? agents.filter((a) => a.id.toLowerCase() === address.toLowerCase())
    : [];
  const covered = mine.filter(
    (a) => a.inGoodStanding && Number(a.slashesCount || 0) === 0,
  ).length;

  return (
    <div className="x-page">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-[10px] uppercase tracking-[0.16em] text-muted">
            Your workspace
          </p>
          <h1 className="x-pixel text-[clamp(32px,5vw,48px)] text-ink">
            My agents
          </h1>
        </div>
        <Link href="/agents/new" className="x-btn-fill">
          Register agent
        </Link>
      </div>

      {!isConnected && (
        <div className="border border-line bg-surface p-6">
          <p className="text-[15px] text-muted">
            Connect a wallet to see agents registered from your address.
          </p>
          <Link href="/connect" className="x-btn-ink mt-4 inline-flex">
            Connect wallet
          </Link>
        </div>
      )}

      {isConnected && (
        <div className="mb-8 flex flex-wrap items-center gap-x-8 gap-y-3 border-y border-line py-4 text-[13px]">
          <div>
            <span className="text-muted">Wallet </span>
            <span className="font-mono text-ink">{shortAddr(address, 6)}</span>
          </div>
          <div>
            <span className="text-muted">Agents </span>
            <span className="font-mono tabular-nums text-ink">
              {loading ? '—' : mine.length}
            </span>
          </div>
          <div>
            <span className="text-muted">In good standing </span>
            <span className="font-mono tabular-nums text-ink">
              {loading ? '—' : covered}
            </span>
          </div>
          <div>
            <span className="text-muted">Network </span>
            <span className="text-ink">Sepolia</span>
          </div>
        </div>
      )}

      {isConnected && loading && (
        <p className="py-8 text-[13px] text-muted">Loading your agents…</p>
      )}

      {isConnected && !loading && mine.length === 0 && (
        <div className="border border-line bg-surface p-6">
          <p className="text-[15px] text-muted">
            No agents found for {shortAddr(address)}. Register one to get
            started.
          </p>
          <Link href="/agents/new" className="x-btn-fill mt-4 inline-flex">
            Register agent
          </Link>
        </div>
      )}

      {isConnected && !loading && mine.length > 0 && (
        <ul className="divide-y divide-line border-b border-line">
          {mine.map((agent) => {
            const slashed = Number(agent.slashesCount || 0) > 0;
            const label = agentDisplayName(agent);
            return (
              <li key={agent.id}>
                <Link
                  href={agentPath(agent)}
                  className="flex items-center justify-between gap-4 py-5 transition-colors duration-150 hover:bg-[#e4e6e4]"
                >
                  <div className="min-w-0">
                    <div className="truncate text-[17px] font-medium text-ink">
                      {agent.ensName ? label : shortAddr(agent.id, 6)}
                    </div>
                    <div
                      className={`mt-1 text-[12px] font-medium ${
                        slashed ? 'text-red' : 'text-muted'
                      }`}
                    >
                      {slashed
                        ? 'Lost - paid to victim'
                        : agent.inGoodStanding
                          ? 'In good standing'
                          : 'Under review'}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-[9px] uppercase tracking-[0.12em] text-muted">
                      Score
                    </div>
                    <div
                      className={`x-pixel text-[28px] leading-none ${
                        slashed ? 'text-red' : 'text-ink'
                      }`}
                    >
                      {agent.standingScore}
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
