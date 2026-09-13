import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ScoreRing } from '@/components/ScoreRing';
import { formatEth, formatTs, shortAddr } from '@/lib/format';
import { resolveAgentProfile } from '@/lib/resolve-agent';
import { getSubgraphUrl } from '@/lib/subgraph';
import {
  scoreBreakdown,
  type AgentProfile,
} from '@/lib/types';

function demoAgent(name: string): AgentProfile {
  const ens = name.includes('.') ? name : `${name}.xenia.eth`;
  return {
    id: '0x6c0d48713602d11355dcf1825eb2e33cf5e2007a',
    ensName: ens,
    standingScore: 70,
    inGoodStanding: true,
    premiumsPaidCount: '2',
    defaultsCount: '0',
    slashesCount: '0',
    backings: [
      {
        id: '0x01',
        host: '0x44cec583971bedb52934652f406a152f3c8afb13',
        stakeAmount: '10000000000000000',
        premiumRate: '1000000000000000',
        status: 'Active',
      },
    ],
    premiumPayments: [
      {
        amount: '1000000000000000',
        timestamp: String(Math.floor(Date.now() / 1000) - 86400),
      },
      {
        amount: '1000000000000000',
        timestamp: String(Math.floor(Date.now() / 1000) - 172800),
      },
    ],
  };
}

export default async function AgentProfilePage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const { name } = await params;
  const url = getSubgraphUrl();
  let agent = await resolveAgentProfile(name);
  let usingDemo = false;
  if (!agent) {
    if (!url) {
      agent = demoAgent(name);
      usingDemo = true;
    } else {
      notFound();
    }
  }

  const slashed = Number(agent.slashesCount) > 0;
  const breakdown = scoreBreakdown(agent);
  const standing = Math.max(0, Math.min(100, agent.standingScore));
  const active =
    agent.backings.find((b) => b.status === 'Active') || agent.backings[0];
  const title = agent.ensName
    ? agent.ensName.replace(/\.xenia\.eth$/, '')
    : shortAddr(agent.id, 6);
  const coverage = slashed
    ? 'Lost'
    : agent.inGoodStanding
      ? 'Active'
      : 'Review';

  return (
    <div className="x-profile">
      {usingDemo && (
        <p className="x-label mb-5">
          Showing reference layout - no indexed agent matched &ldquo;{name}
          &rdquo;.
        </p>
      )}

      <nav className="mb-4 text-[11px] text-muted" aria-label="Breadcrumb">
        <Link href="/explore" className="hover:text-ink">
          Agents
        </Link>
        <span className="mx-2">/</span>
        <span className="font-mono text-ink">{shortAddr(agent.id, 6)}</span>
      </nav>

      <header className="flex flex-col gap-5 border-b border-line pb-7 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="x-pixel text-[clamp(32px,5vw,48px)] text-ink">{title}</h1>
          <p className="mt-2 break-all font-mono text-[12px] text-muted">
            {agent.id}
          </p>
          <p
            className={`mt-2 text-[13px] font-medium ${
              slashed ? 'text-red' : 'text-ink'
            }`}
          >
            {slashed
              ? 'Lost - stake paid to victim'
              : agent.inGoodStanding
                ? 'In good standing'
                : 'Standing under review'}
          </p>
        </div>
        <Link
          href={`/agents/${encodeURIComponent(agent.id)}/back`}
          className="x-btn-fill shrink-0 self-start sm:self-auto"
        >
          Back this agent
        </Link>
      </header>

      <div className="mt-0 grid grid-cols-2 border-b border-line lg:grid-cols-4">
        {[
          { label: 'Premiums', value: agent.premiumsPaidCount },
          { label: 'Defaults', value: agent.defaultsCount },
          { label: 'Slashes', value: agent.slashesCount },
          { label: 'Coverage', value: coverage },
        ].map((m, i) => (
          <div
            key={m.label}
            className={`border-line py-5 ${
              i % 2 === 1 ? 'pl-5 sm:pl-6' : 'pr-5 sm:pr-6'
            } ${i > 0 ? 'lg:border-l lg:pl-6' : ''} ${
              i === 2 ? 'border-t lg:border-t-0' : ''
            } ${i === 3 ? 'border-t lg:border-t-0' : ''}`}
          >
            <div className="text-[9px] uppercase tracking-[0.12em] text-muted">
              {m.label}
            </div>
            <div
              className={`mt-2 x-pixel text-[28px] leading-none tabular-nums ${
                m.label === 'Coverage' && slashed ? 'text-red' : 'text-ink'
              }`}
            >
              {m.value}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_280px] lg:items-start lg:gap-12">
        <section>
          <div className="mb-4 flex items-end justify-between gap-4">
            <h2 className="x-pixel text-[22px] text-ink">Why this score</h2>
            <div className="flex items-baseline gap-2">
              <span className="text-[9px] uppercase tracking-[0.12em] text-muted">
                Standing
              </span>
              <span
                className={`x-pixel text-[28px] leading-none ${
                  slashed ? 'text-red' : 'text-ink'
                }`}
              >
                {standing}
              </span>
            </div>
          </div>
          <ul className="border-y border-line">
            {[
              { label: 'Base score', value: `+${breakdown.base}`, bad: false },
              {
                label: 'Premium bonus',
                value: `+${breakdown.premiumBonus}`,
                bad: false,
              },
              {
                label: 'Default penalty',
                value: String(breakdown.defaultPenalty),
                bad: breakdown.defaults > 0,
              },
              {
                label: 'Slash penalty',
                value: String(breakdown.slashPenalty),
                bad: breakdown.slashes > 0,
              },
              ...(breakdown.floorAdjustment > 0
                ? [
                    {
                      label: 'Floor (min 0)',
                      value: `+${breakdown.floorAdjustment}`,
                      bad: false,
                    },
                  ]
                : []),
              ...(breakdown.capAdjustment < 0
                ? [
                    {
                      label: 'Cap (max 100)',
                      value: String(breakdown.capAdjustment),
                      bad: false,
                    },
                  ]
                : []),
            ].map((row) => (
              <li
                key={row.label}
                className="flex items-center justify-between border-b border-line py-3.5 text-[14px] last:border-b-0"
              >
                <span className="text-muted">{row.label}</span>
                <span
                  className={`font-mono text-[13px] tabular-nums ${
                    row.bad ? 'text-red' : 'text-ink'
                  }`}
                >
                  {row.value}
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-10">
            <h2 className="mb-4 x-pixel text-[22px] text-ink">Premium history</h2>
            {agent.premiumPayments.length === 0 ? (
              <p className="border-y border-line py-5 text-[14px] text-muted">
                No premiums recorded yet.
              </p>
            ) : (
              <ul className="border-y border-line">
                {agent.premiumPayments.map((p, i) => (
                  <li
                    key={`${p.timestamp}-${i}`}
                    className="flex items-center justify-between gap-4 border-b border-line py-3.5 last:border-b-0"
                  >
                    <span className="font-mono text-[12px] tabular-nums text-muted">
                      {formatTs(p.timestamp)}
                    </span>
                    <span className="text-[13px] text-muted">Trust fee paid</span>
                    <span className="font-mono text-[13px] tabular-nums text-ink">
                      {formatEth(p.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <aside className="flex flex-col gap-0 border border-line bg-surface lg:sticky lg:top-6">
          <div className="flex flex-col items-center gap-4 border-b border-line p-6">
            <ScoreRing score={standing} slashed={slashed} />
            <p className="text-center text-[12px] leading-relaxed text-muted">
              Score from premiums, defaults, and slashes. Floored at 0, capped at
              100.
            </p>
          </div>
          <div className="grid grid-cols-1 divide-y divide-line">
            <div className="p-5">
              <div className="text-[9px] uppercase tracking-[0.12em] text-muted">
                Current sponsor
              </div>
              <div className="mt-2 font-mono text-[13px] text-ink">
                {active ? shortAddr(active.host, 6) : '—'}
              </div>
            </div>
            <div className="p-5">
              <div className="text-[9px] uppercase tracking-[0.12em] text-muted">
                Trust deposit
              </div>
              <div className="mt-2 x-pixel text-[26px] leading-none text-ink">
                {active ? formatEth(active.stakeAmount) : '—'}
              </div>
              <p className="mt-2 text-[11px] leading-relaxed text-muted">
                Paid to the injured counterparty on default.
              </p>
            </div>
            <div className="p-5">
              <div className="text-[9px] uppercase tracking-[0.12em] text-muted">
                Trust fee rate
              </div>
              <div className="mt-2 x-pixel text-[22px] leading-none text-ink">
                {active ? `${formatEth(active.premiumRate)} / period` : '—'}
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
