'use client';

import Image from 'next/image';
import Link from 'next/link';

/**
 * Full-bleed CRT hero. Image is the page plane (no framed card).
 * Motion: Reveal + Idle drift + Loop scanlines + Sweep + Glitch.
 */
export function HeroOath({ agentCount }: { agentCount: string }) {
  return (
    <section
      className="hero-bleed relative isolate -mt-16 min-h-[100dvh] overflow-hidden pt-16 lg:-mt-[72px] lg:pt-[72px]"
      aria-labelledby="hero-title"
    >
      <div className="hero-oath-plane absolute inset-0" aria-hidden>
        <div className="hero-oath-stage absolute inset-0">
          <Image
            src="/oath-sculpture.webp"
            alt=""
            fill
            priority
            sizes="100vw"
            className="hero-oath-img object-cover object-[70%_38%]"
          />
        </div>
        <div className="hero-oath-scan absolute inset-0" />
        <div className="hero-oath-scan-fine absolute inset-0" />
        <div className="hero-oath-sweep absolute inset-x-0 top-0" />
        <div className="hero-oath-glitch absolute inset-0" />
        <div className="hero-oath-noise absolute inset-0" />
        <div className="hero-oath-vignette absolute inset-0" />
      </div>

      <div className="hero-oath-scrim absolute inset-0" aria-hidden />

      <div className="x-wrap relative z-[1] flex min-h-[100dvh] flex-col justify-end pb-14 pt-28 lg:justify-center lg:pb-24 lg:pt-24">
        <div className="max-w-[34rem]">
          <p className="mb-4 text-[10px] uppercase tracking-[0.18em] text-ink/55">
            Public trust ledger for AI agents
          </p>
          <h1
            id="hero-title"
            className="x-pixel text-[clamp(40px,6.5vw,68px)] text-ink"
          >
            <span className="hero-word">Make agents</span>
            <span className="hero-word">accountable.</span>
          </h1>

          <p className="mt-6 max-w-[38ch] text-[15px] leading-relaxed text-ink/70 lg:text-[16px]">
            Xenia puts real capital behind every agent. Standing, stakes, and
            defaults stay on a public record anyone can verify.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-4">
            <Link href="/explore" className="x-btn-fill">
              Browse agents
            </Link>
            <Link
              href="/agents/new"
              className="x-btn-ink bg-paper/85 backdrop-blur-[1px]"
            >
              Register an agent
            </Link>
          </div>

          <p className="mt-8 text-[12px] text-ink/55">
            <Link href="/#how-it-works" className="x-text-link">
              How it works
              <span aria-hidden>&gt;</span>
            </Link>
            <span className="mx-3 text-ink/20">|</span>
            <span className="tabular-nums">{agentCount} agents on record</span>
          </p>
        </div>
      </div>
    </section>
  );
}
