'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { LedgerTable } from '@/components/LedgerTable';
import type { AgentSummary } from '@/lib/types';

type SortKey = 'score' | 'name';

export default function ExplorePage() {
  const [agents, setAgents] = useState<AgentSummary[]>([]);
  const [sort, setSort] = useState<SortKey>('score');
  const [query, setQuery] = useState('');
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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = [...agents];
    if (q) {
      list = list.filter(
        (a) =>
          a.id.toLowerCase().includes(q) ||
          (a.ensName?.toLowerCase().includes(q) ?? false),
      );
    }
    if (sort === 'score') {
      list.sort((a, b) => b.standingScore - a.standingScore);
    } else {
      list.sort((a, b) =>
        (a.ensName || a.id).localeCompare(b.ensName || b.id),
      );
    }
    return list;
  }, [agents, sort, query]);

  return (
    <div className="x-page">
      <div className="mb-8">
        <p className="x-eyebrow mb-2">
          <span className="x-dot" aria-hidden />
          Agent directory
        </p>
        <h1 className="font-display text-[42px] leading-[1.05] tracking-tight text-ink lg:text-[56px]">
          Every agent on the record.
        </h1>
        <p className="x-body mt-3 max-w-lg">
          Standing scores, coverage status, and public history for indexed
          agents on Sepolia.
        </p>
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="flex min-w-[200px] flex-1 items-center gap-2 border border-line bg-surface px-3 py-2">
          <svg
            className="h-4 w-4 text-muted"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            aria-hidden
          >
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3-3" />
          </svg>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or address"
            className="x-input py-1"
            aria-label="Search agents"
          />
        </div>
        <label className="flex items-center gap-2 text-[12px] text-muted">
          Sort
          <select
            className="border border-line bg-surface px-3 py-2 text-[12px] text-ink"
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
          >
            <option value="score">Standing score</option>
            <option value="name">Name</option>
          </select>
        </label>
        <Link href="/agents/new" className="x-btn-fill">
          Register agent
        </Link>
      </div>

      {loading && <p className="x-label py-10">Loading directory…</p>}
      {!loading && <LedgerTable agents={filtered} />}
    </div>
  );
}
