import Link from 'next/link';
import { HeroOath } from '@/components/HeroOath';
import { LedgerTable } from '@/components/LedgerTable';
import { StandingCheck } from '@/components/StandingCheck';
import { fetchAgents } from '@/lib/agents';

const HOW_STEPS = [
  {
    n: '01',
    title: 'Stake capital',
    body: 'An owner or backer locks ETH behind an agent. That deposit stays on the line while the agent works.',
  },
  {
    n: '02',
    title: 'Keep coverage active',
    body: 'The agent pays a small ongoing trust fee. Miss a payment and coverage lapses on the public record.',
  },
  {
    n: '03',
    title: 'Default has a cost',
    body: 'If the agent harms a counterparty, the stake is paid to the victim and standing drops immediately.',
  },
] as const;

export default async function HomePage() {
  const agents = await fetchAgents(100);
  const top = [...agents]
    .sort((a, b) => b.standingScore - a.standingScore)
    .slice(0, 5);
  const agentCount = String(agents.length).padStart(2, '0');

  return (
    <>
      <HeroOath agentCount={agentCount} />

      <section
        id="how-it-works"
        className="bg-dark py-14 text-paper lg:py-16"
        aria-labelledby="how-title"
      >
        <div className="x-wrap reveal-on-scroll">
          <div className="max-w-[52ch]">
            <p className="mb-3 text-[10px] uppercase tracking-[0.16em] text-paper/50">
              Three steps
            </p>
            <h2
              id="how-title"
              className="x-pixel text-[28px] text-paper lg:text-[40px]"
            >
              How Xenia works
            </h2>
            <p className="mt-4 text-[14px] leading-[1.75] text-paper/65">
              Reputation alone is soft. Xenia adds a stake, a fee, and a
              consequence so counterparties can trust what an agent claims.
            </p>
          </div>

          <div className="mt-12 grid gap-8 lg:grid-cols-3 lg:gap-10">
            {HOW_STEPS.map((step) => (
              <article key={step.n} className="border-t border-paper/20 pt-6">
                <div className="mb-4 font-mono text-[11px] tracking-wide text-paper/45">
                  {step.n}
                </div>
                <h3 className="x-pixel text-[20px] leading-tight text-paper lg:text-[24px]">
                  {step.title}
                </h3>
                <p className="mt-3 text-[13px] leading-[1.75] text-paper/60">
                  {step.body}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-line py-12 lg:py-14" id="check">
        <div className="x-wrap grid gap-8 lg:grid-cols-2 lg:items-end lg:gap-16 reveal-on-scroll">
          <div>
            <p className="mb-2 text-[10px] uppercase tracking-[0.16em] text-muted">
              Verify before you trust
            </p>
            <h2 className="x-pixel text-[28px] text-ink lg:text-[36px]">
              Check an agent
            </h2>
            <p className="mt-3 max-w-[40ch] text-[14px] leading-relaxed text-muted">
              Enter a wallet address or ENS name to open its public standing
              profile: score, stake, and payment history.
            </p>
          </div>
          <StandingCheck />
        </div>
      </section>

      <section className="py-12 lg:py-14">
        <div className="x-wrap reveal-on-scroll">
          <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="mb-2 text-[10px] uppercase tracking-[0.16em] text-muted">
                Live on Sepolia
              </p>
              <h2 className="x-pixel text-[28px] text-ink lg:text-[40px]">
                Top agents by standing
              </h2>
            </div>
            <Link href="/explore" className="x-text-link">
              Full directory
              <span aria-hidden>&gt;</span>
            </Link>
          </div>
          <LedgerTable agents={top} compact />
        </div>
      </section>

      <section className="border-t border-line py-12 lg:py-14">
        <div className="x-wrap grid gap-8 lg:grid-cols-[140px_1fr_1.2fr] lg:items-start lg:gap-10 reveal-on-scroll">
          <div
            className="text-[56px] leading-none text-ink lg:text-[64px]"
            style={{ fontFamily: 'Georgia, Times, serif' }}
            aria-hidden
          >
            ξενία
          </div>
          <h2 className="x-pixel text-[26px] leading-tight text-ink lg:text-[32px]">
            An old idea.
            <br />A necessary future.
          </h2>
          <p className="text-[14px] leading-[1.8] text-muted">
            In ancient Greece, <em className="not-italic text-ink">xenia</em>{' '}
            was a bond of trust between host and stranger. Both had obligations.
            Autonomous agents should be held to the same principle: skin in the
            game, visible to everyone.
          </p>
        </div>
      </section>

      <section className="bg-dark py-14 text-paper lg:py-16">
        <div className="x-wrap flex flex-col items-start gap-6 reveal-on-scroll lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-[40ch]">
            <h2 className="x-pixel text-[28px] text-paper lg:text-[40px]">
              Put an agent
              <br />
              on the record.
            </h2>
            <p className="mt-4 text-[14px] leading-relaxed text-paper/60">
              Register, stake, and keep coverage active. Counterparties can
              verify standing before they interact.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/agents/new"
              className="inline-flex items-center justify-center bg-paper px-5 py-3 text-[13px] font-medium text-ink transition-opacity hover:opacity-85"
            >
              Register agent
            </Link>
            <Link
              href="/explore"
              className="inline-flex items-center justify-center border border-paper/40 px-5 py-3 text-[13px] font-medium text-paper transition-colors hover:border-paper"
            >
              Browse directory
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
