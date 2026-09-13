'use client';

import { useEffect, useMemo, useState } from 'react';
import type { DemoStatePayload } from '@/lib/demo';

type StepId =
  | 'idle'
  | 'boot'
  | 'register'
  | 'stake'
  | 'premium'
  | 'default'
  | 'waiting'
  | 'slash'
  | 'index'
  | 'verdict'
  | 'done'
  | 'error';

type Step = {
  id: StepId;
  n: string;
  title: string;
  body: string;
};

const STEPS: Step[] = [
  {
    id: 'idle',
    n: '00',
    title: 'Ready',
    body: 'Mint two new agents and run the full Sepolia path. Gas only when you press Run.',
  },
  {
    id: 'boot',
    n: '01',
    title: 'Mint',
    body: 'Fresh wallets + unique ENS namehashes for this run.',
  },
  {
    id: 'register',
    n: '02',
    title: 'Register',
    body: 'Fund from your key, then register both agents on-chain.',
  },
  {
    id: 'stake',
    n: '03',
    title: 'Stake',
    body: 'Host locks ETH behind Agent A. Coverage goes Active.',
  },
  {
    id: 'premium',
    n: '04',
    title: 'Trust fee',
    body: 'Agent A pays the ongoing fee. Standing updates.',
  },
  {
    id: 'default',
    n: '05',
    title: 'Default',
    body: 'Agent B is backed, then a counterparty reports harm.',
  },
  {
    id: 'waiting',
    n: '06',
    title: 'Window',
    body: 'On-chain dispute window (~10s). Real time.',
  },
  {
    id: 'slash',
    n: '07',
    title: 'Slash',
    body: 'Stake moves to the victim. B is marked Lost.',
  },
  {
    id: 'index',
    n: '08',
    title: 'Index',
    body: 'Brief wait for The Graph to catch up.',
  },
  {
    id: 'verdict',
    n: '09',
    title: 'Decide',
    body: 'Standing check: transact with A, refuse B.',
  },
  {
    id: 'done',
    n: 'OK',
    title: 'Complete',
    body: 'This run finished on Sepolia.',
  },
  {
    id: 'error',
    n: '!!',
    title: 'Failed',
    body: 'The run stopped. Read the error, top up if needed, retry.',
  },
];

const PREVIEWABLE = STEPS.filter(
  (s) => !['idle', 'error', 'done'].includes(s.id),
);

const TOUR_STEPS: StepId[] = [
  'boot',
  'register',
  'stake',
  'premium',
  'default',
  'waiting',
  'slash',
  'index',
  'verdict',
];

function short(addr?: string | null) {
  if (!addr) return '—';
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function SceneVisual({
  stepId,
  status,
  scores,
  runAgents,
  networkAgents,
}: {
  stepId: StepId;
  status: string;
  scores: { scoreA?: number; scoreB?: number; takeA?: boolean; takeB?: boolean };
  runAgents: {
    agentA?: { id: string; ensName: string };
    agentB?: { id: string; ensName: string };
  };
  networkAgents: number;
}) {
  if (stepId === 'error') {
    return (
      <div className="demo-scene-enter flex h-full flex-col justify-center">
        <p className="x-pixel text-[clamp(48px,10vw,96px)] text-[#ff6b5a]">
          ERROR
        </p>
        <p className="mt-6 max-w-[40rem] font-mono text-[14px] leading-relaxed text-paper/90">
          {status}
        </p>
      </div>
    );
  }

  if (stepId === 'idle' || stepId === 'boot') {
    return (
      <div className="demo-scene-enter flex h-full flex-col justify-end pb-4">
        <p className="text-[11px] uppercase tracking-[0.2em] text-paper/55">
          Sepolia · {networkAgents} agents indexed
        </p>
        <p className="mt-4 x-pixel text-[clamp(48px,11vw,110px)] leading-[0.9] text-paper">
          {stepId === 'idle' ? 'IDLE' : 'LIVE'}
          <span className="demo-caret ml-2 inline-block h-[0.75em] w-[0.4em] bg-paper align-middle" />
        </p>
        <p className="mt-6 max-w-[36ch] text-[16px] leading-relaxed text-paper/75">
          {stepId === 'idle'
            ? 'Press Run to mint new agents and execute the protocol for real.'
            : 'Spinning up wallets and namehashes for this run.'}
        </p>
      </div>
    );
  }

  if (stepId === 'register') {
    const label =
      runAgents.agentA?.ensName?.replace(/\.xenia\.eth$/i, '') || 'NEW-A';
    return (
      <div className="demo-scene-enter flex h-full flex-col items-start justify-center">
        <p className="text-[11px] uppercase tracking-[0.2em] text-paper/55">
          Identity stamp
        </p>
        <p className="demo-stamp mt-4 x-pixel text-[clamp(36px,8vw,84px)] text-paper">
          {label}
        </p>
        <p className="mt-4 font-mono text-[13px] text-paper/70">
          {runAgents.agentA?.ensName || 'minting…'}
        </p>
        {runAgents.agentA?.id && (
          <p className="mt-2 font-mono text-[12px] text-paper/50">
            {short(runAgents.agentA.id)}
          </p>
        )}
      </div>
    );
  }

  if (stepId === 'stake') {
    return (
      <div className="demo-scene-enter grid h-full grid-cols-[1fr_auto_1fr] items-center gap-4 sm:gap-8">
        <div className="border border-paper/40 bg-black/30 p-5 backdrop-blur-sm">
          <p className="text-[10px] uppercase tracking-[0.16em] text-paper/60">
            Host
          </p>
          <p className="mt-3 x-pixel text-[28px] text-paper">SPONSOR</p>
        </div>
        <div className="relative flex h-28 w-12 items-end justify-center overflow-hidden">
          <div className="demo-lock h-full w-3 bg-paper" />
          <div className="demo-beam absolute inset-y-10 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-paper to-transparent" />
        </div>
        <div className="border border-paper/40 bg-black/30 p-5 backdrop-blur-sm">
          <p className="text-[10px] uppercase tracking-[0.16em] text-paper/60">
            Agent A
          </p>
          <p className="mt-3 x-pixel text-[28px] text-[#7dcea0]">ACTIVE</p>
        </div>
      </div>
    );
  }

  if (stepId === 'premium') {
    return (
      <div className="demo-scene-enter flex h-full flex-col items-start justify-center">
        <div className="demo-pulse relative grid h-36 w-36 place-items-center border border-paper/50 bg-black/35">
          <span className="x-pixel text-[48px] text-paper">
            {scores.scoreA ?? '—'}
          </span>
        </div>
        <p className="mt-6 x-pixel text-[32px] text-paper">TRUST FEE</p>
        <p className="mt-3 font-mono text-[13px] text-paper/65">
          premium settled on-chain
        </p>
      </div>
    );
  }

  if (stepId === 'default' || stepId === 'waiting') {
    return (
      <div
        className={`demo-scene-enter flex h-full flex-col justify-center ${
          stepId === 'default' ? 'demo-alert' : ''
        }`}
      >
        <p className="text-[11px] uppercase tracking-[0.2em] text-[#ffb4a8]">
          {stepId === 'waiting' ? 'Dispute window' : 'Alert'}
        </p>
        <p className="mt-3 x-pixel text-[clamp(48px,10vw,96px)] text-[#ff6b5a]">
          {stepId === 'waiting' ? 'WAIT' : 'DEFAULT'}
        </p>
        <p className="mt-4 font-mono text-[13px] text-paper/75">
          {runAgents.agentB?.ensName || 'agent-b'} ·{' '}
          {stepId === 'waiting' ? status || 'waiting…' : 'dispute opened'}
        </p>
      </div>
    );
  }

  if (stepId === 'slash') {
    return (
      <div className="demo-scene-enter grid h-full grid-cols-[1fr_auto_1fr] items-center gap-4 sm:gap-8">
        <div className="border border-[#ff6b5a]/60 bg-[#2a1210]/80 p-5">
          <p className="text-[10px] uppercase tracking-[0.16em] text-[#ffb4a8]">
            Stake
          </p>
          <p className="mt-3 x-pixel text-[28px] text-paper">LOCKED</p>
        </div>
        <div className="relative h-2 w-20 overflow-hidden sm:w-28">
          <div className="demo-beam absolute inset-0 bg-gradient-to-r from-[#ff6b5a] via-paper to-[#7dcea0]" />
        </div>
        <div className="border border-[#7dcea0]/60 bg-[#101610]/80 p-5">
          <p className="text-[10px] uppercase tracking-[0.16em] text-[#7dcea0]">
            Victim
          </p>
          <p className="mt-3 x-pixel text-[28px] text-paper">PAID</p>
        </div>
      </div>
    );
  }

  if (stepId === 'index') {
    return (
      <div className="demo-scene-enter flex h-full flex-col justify-center">
        <p className="x-pixel text-[clamp(40px,8vw,72px)] text-paper">INDEX</p>
        <p className="mt-4 font-mono text-[13px] text-paper/65">
          Waiting for subgraph…
        </p>
      </div>
    );
  }

  // verdict / done
  const a = scores.scoreA ?? 0;
  const b = scores.scoreB ?? 0;
  const okA = scores.takeA ?? a >= 50;
  const refuseB = !(scores.takeB ?? false) || b < 50;
  return (
    <div className="demo-scene-enter grid h-full gap-4 sm:grid-cols-2 sm:gap-6">
      <div className="flex flex-col justify-between border border-[#7dcea0]/50 bg-[#101610]/85 p-5 sm:p-6">
        <div>
          <p className="text-[10px] uppercase tracking-[0.16em] text-[#7dcea0]">
            Agent A
          </p>
          <p className="mt-2 font-mono text-[12px] text-paper/80">
            {runAgents.agentA?.ensName || 'pending'}
          </p>
        </div>
        <p className="demo-score x-pixel text-[64px] text-paper">{a}</p>
        <p className="x-pixel text-[22px] text-[#7dcea0]">
          {okA ? 'TRANSACT' : 'HOLD'}
        </p>
      </div>
      <div className="flex flex-col justify-between border border-[#ff6b5a]/50 bg-[#2a1210]/85 p-5 sm:p-6">
        <div>
          <p className="text-[10px] uppercase tracking-[0.16em] text-[#ffb4a8]">
            Agent B
          </p>
          <p className="mt-2 font-mono text-[12px] text-paper/80">
            {runAgents.agentB?.ensName || 'pending'}
          </p>
        </div>
        <p className="demo-score x-pixel text-[64px] text-[#ff6b5a]">{b}</p>
        <p className="x-pixel text-[22px] text-[#ff6b5a]">
          {refuseB ? 'REFUSE' : 'REVIEW'}
        </p>
      </div>
    </div>
  );
}

export function DemoTheater() {
  const [state, setState] = useState<DemoStatePayload | null>(null);
  const [stepId, setStepId] = useState<StepId>('idle');
  const [previewId, setPreviewId] = useState<StepId | null>(null);
  const [status, setStatus] = useState('');
  const [running, setRunning] = useState(false);
  const [touring, setTouring] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [logLines, setLogLines] = useState<string[]>([]);
  const [scores, setScores] = useState<{
    scoreA?: number;
    scoreB?: number;
    takeA?: boolean;
    takeB?: boolean;
  }>({});
  const [runAgents, setRunAgents] = useState<{
    agentA?: { id: string; ensName: string };
    agentB?: { id: string; ensName: string };
  }>({});

  const activeId =
    running || stepId === 'error' || stepId === 'done'
      ? stepId
      : previewId || stepId;
  const step = STEPS.find((s) => s.id === activeId) ?? STEPS[0];
  const tourIndex = Math.max(
    0,
    TOUR_STEPS.indexOf(activeId as (typeof TOUR_STEPS)[number]),
  );

  useEffect(() => {
    if (!touring || running) return;
    const id = window.setInterval(() => {
      setPreviewId((prev) => {
        const current = prev && TOUR_STEPS.includes(prev) ? prev : TOUR_STEPS[0];
        const idx = TOUR_STEPS.indexOf(current);
        const next = TOUR_STEPS[(idx + 1) % TOUR_STEPS.length];
        return next;
      });
    }, 2200);
    return () => window.clearInterval(id);
  }, [touring, running]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch('/api/demo-state', { cache: 'no-store' });
        const json = (await res.json()) as DemoStatePayload;
        if (!cancelled) setState(json);
      } catch {
        if (!cancelled) setState(null);
      }
    }
    load();
    const id = window.setInterval(load, running ? 10_000 : 45_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [running]);

  function stepPreview(delta: number) {
    if (running) return;
    setTouring(false);
    const base =
      previewId && TOUR_STEPS.includes(previewId)
        ? previewId
        : TOUR_STEPS.includes(stepId as (typeof TOUR_STEPS)[number])
          ? stepId
          : TOUR_STEPS[0];
    const idx = TOUR_STEPS.indexOf(base as (typeof TOUR_STEPS)[number]);
    const next =
      TOUR_STEPS[(idx + delta + TOUR_STEPS.length) % TOUR_STEPS.length];
    setPreviewId(next);
  }

  async function runOnchain() {
    if (running) return;
    setTouring(false);
    setRunning(true);
    setPreviewId(null);
    setStepId('boot');
    setStatus('Starting on-chain demo…');
    setTxHash(null);
    setScores({});
    setRunAgents({});
    setLogLines(['Starting on-chain demo…']);

    try {
      const res = await fetch('/api/run-demo', { method: 'POST' });
      if (!res.ok || !res.body) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || `HTTP ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const chunks = buffer.split('\n\n');
        buffer = chunks.pop() || '';
        for (const chunk of chunks) {
          const line = chunk.split('\n').find((l) => l.startsWith('data: '));
          if (!line) continue;
          const event = JSON.parse(line.slice(6)) as {
            step: StepId;
            message: string;
            txHash?: string;
            scoreA?: number;
            scoreB?: number;
            takeA?: boolean;
            takeB?: boolean;
            agentA?: { id: string; ensName: string };
            agentB?: { id: string; ensName: string };
          };
          setStepId(event.step);
          setStatus(event.message);
          setLogLines((prev) => [...prev.slice(-8), event.message]);
          if (event.txHash) setTxHash(event.txHash);
          if (event.agentA || event.agentB) {
            setRunAgents((prev) => ({
              agentA: event.agentA ?? prev.agentA,
              agentB: event.agentB ?? prev.agentB,
            }));
          }
          if (
            event.scoreA != null ||
            event.scoreB != null ||
            event.takeA != null ||
            event.takeB != null
          ) {
            setScores({
              scoreA: event.scoreA,
              scoreB: event.scoreB,
              takeA: event.takeA,
              takeB: event.takeB,
            });
          }
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setStepId('error');
      setStatus(message);
      setLogLines((prev) => [...prev, message]);
    } finally {
      setRunning(false);
      try {
        const res = await fetch('/api/demo-state', { cache: 'no-store' });
        setState((await res.json()) as DemoStatePayload);
      } catch {
        /* ignore */
      }
    }
  }

  const subtitle = useMemo(() => {
    if (runAgents.agentA || runAgents.agentB) {
      return `${runAgents.agentA?.ensName || 'A…'}  ·  ${runAgents.agentB?.ensName || 'B…'}`;
    }
    return `${state?.network.agents ?? 0} agents on ledger · ready`;
  }, [runAgents, state]);

  return (
    <section
      id="live-demo"
      className="relative isolate min-h-[100dvh] overflow-x-hidden"
      aria-label="Live Xenia demo theater"
    >
      <div className="hero-oath-plane absolute inset-0" aria-hidden>
        <div
          className="hero-oath-stage absolute inset-0 bg-cover bg-center opacity-50"
          style={{ backgroundImage: "url('/oath-sculpture.webp')" }}
        />
        <div className="hero-oath-scan absolute inset-0" />
        <div className="hero-oath-scan-fine absolute inset-0" />
        <div className="hero-oath-sweep absolute inset-x-0 top-0" />
        <div className="hero-oath-glitch absolute inset-0" />
        <div className="hero-oath-noise absolute inset-0" />
        <div className="hero-oath-vignette absolute inset-0" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0e100e]/90 via-[#0e100e]/55 to-[#0e100e]/92" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0e100e]/85 via-transparent to-[#0e100e]/70" />
      </div>

      <div className="relative z-[1] mx-auto grid min-h-[100dvh] w-[calc(100%-32px)] max-w-[1280px] grid-rows-[auto_minmax(0,1fr)_auto] gap-4 pt-20 pb-5 sm:w-[calc(100%-48px)] lg:grid-cols-[200px_minmax(0,1fr)_260px] lg:grid-rows-[auto_minmax(0,1fr)_auto] lg:gap-x-8 lg:gap-y-4 lg:pb-6 lg:pt-[88px]">
        <div className="col-span-full flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-paper/55">
              On-chain demo · Sepolia
            </p>
            <p className="mt-1 font-mono text-[12px] text-paper/60">{subtitle}</p>
          </div>
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
            <button
              type="button"
              disabled={running}
              onClick={() => void runOnchain()}
              className="min-h-11 flex-1 bg-paper px-5 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink transition hover:bg-paper/90 disabled:opacity-50 sm:flex-none"
            >
              {running ? 'Running…' : 'Run on-chain'}
            </button>
            <button
              type="button"
              disabled={running}
              onClick={() => {
                setTouring((v) => !v);
                if (!previewId) setPreviewId(TOUR_STEPS[0]);
              }}
              className={`min-h-11 border px-4 text-[11px] font-semibold uppercase tracking-[0.12em] transition disabled:opacity-50 ${
                touring
                  ? 'border-paper bg-paper/20 text-paper'
                  : 'border-paper/40 text-paper hover:bg-paper/10'
              }`}
            >
              {touring ? 'Stop tour' : 'Tour'}
            </button>
            <div className="flex">
              <button
                type="button"
                disabled={running}
                onClick={() => stepPreview(-1)}
                className="min-h-11 border border-paper/40 border-r-0 px-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-paper transition hover:bg-paper/10 disabled:opacity-50"
                aria-label="Previous scene"
              >
                Prev
              </button>
              <button
                type="button"
                disabled={running}
                onClick={() => stepPreview(1)}
                className="min-h-11 border border-paper/40 px-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-paper transition hover:bg-paper/10 disabled:opacity-50"
                aria-label="Next scene"
              >
                Next
              </button>
            </div>
            <button
              type="button"
              disabled={running}
              onClick={() => {
                setTouring(false);
                setStepId('idle');
                setPreviewId(null);
                setStatus('');
                setTxHash(null);
                setRunAgents({});
                setScores({});
                setLogLines([]);
              }}
              className="min-h-11 border border-paper/25 px-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-paper/75 transition hover:bg-paper/10 disabled:opacity-50"
            >
              Reset
            </button>
          </div>
        </div>

        <nav
          aria-label="Demo steps"
          className="col-span-full lg:col-span-1 lg:row-start-2"
        >
          <p className="mb-2 hidden text-[10px] uppercase tracking-[0.16em] text-paper/45 lg:block">
            Protocol path
          </p>
          <ul className="flex gap-1.5 overflow-x-auto pb-1 lg:block lg:space-y-1 lg:overflow-visible">
            {PREVIEWABLE.map((s) => {
              const active = activeId === s.id;
              const passed =
                STEPS.findIndex((x) => x.id === stepId) >=
                  STEPS.findIndex((x) => x.id === s.id) &&
                stepId !== 'idle' &&
                stepId !== 'error';
              return (
                <li key={s.id} className="shrink-0">
                  <button
                    type="button"
                    disabled={running}
                    onClick={() => {
                      if (!running) {
                        setTouring(false);
                        setPreviewId(s.id);
                      }
                    }}
                    className={`flex min-w-[6.75rem] items-center gap-2.5 border px-2.5 py-2 text-left transition lg:min-w-0 lg:w-full ${
                      active
                        ? 'border-paper bg-paper text-ink'
                        : passed
                          ? 'border-paper/35 bg-paper/10 text-paper'
                          : 'border-paper/15 bg-black/20 text-paper/55 backdrop-blur-sm hover:border-paper/35 hover:text-paper'
                    } disabled:cursor-not-allowed`}
                  >
                    <span className="font-mono text-[10px]">{s.n}</span>
                    <span className="text-[12px] font-medium">{s.title}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="col-span-full flex min-h-[42vh] flex-col justify-center lg:col-span-1 lg:row-start-2 lg:min-h-0">
          <SceneVisual
            key={activeId}
            stepId={activeId}
            status={status}
            scores={scores}
            runAgents={runAgents}
            networkAgents={state?.network.agents ?? 0}
          />
        </div>

        <aside className="col-span-full flex flex-col justify-between gap-5 border-t border-paper/15 pt-4 lg:col-span-1 lg:row-start-2 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
          <div>
            <p className="font-mono text-[11px] text-paper/45">
              STEP {step.n}
              {!running && previewId
                ? ` · preview ${tourIndex + 1}/${TOUR_STEPS.length}`
                : ''}
            </p>
            <h1 className="mt-2 x-pixel text-[clamp(28px,4vw,40px)] text-paper">
              {step.title}
            </h1>
            <p className="mt-3 text-[14px] leading-relaxed text-paper/75">
              {running && status ? status : step.body}
            </p>
            {!running && previewId && stepId === 'idle' && (
              <p className="mt-3 text-[12px] text-paper/45">
                Preview only. Run on-chain spends Sepolia gas.
              </p>
            )}
            {txHash && (
              <a
                className="mt-4 inline-block font-mono text-[11px] text-[#7dcea0] underline-offset-2 hover:underline"
                href={`https://sepolia.etherscan.io/tx/${txHash}`}
                target="_blank"
                rel="noreferrer"
              >
                Latest tx {short(txHash)}
              </a>
            )}
          </div>

          <div>
            <p className="text-[10px] uppercase tracking-[0.16em] text-paper/45">
              Event log
            </p>
            <ul className="mt-2 max-h-28 space-y-1.5 overflow-y-auto font-mono text-[11px] text-paper/60 sm:max-h-36">
              {(logLines.length ? logLines : ['Waiting for Run…']).map(
                (line, i) => (
                  <li key={`${i}-${line.slice(0, 24)}`} className="leading-snug">
                    {line}
                  </li>
                ),
              )}
            </ul>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="border border-paper/20 bg-black/30 p-3 backdrop-blur-sm">
                <p className="text-[10px] uppercase tracking-[0.12em] text-paper/50">
                  A score
                </p>
                <p className="mt-1 x-pixel text-[26px] text-paper">
                  {scores.scoreA ?? '—'}
                </p>
              </div>
              <div className="border border-paper/20 bg-black/30 p-3 backdrop-blur-sm">
                <p className="text-[10px] uppercase tracking-[0.12em] text-paper/50">
                  B score
                </p>
                <p className="mt-1 x-pixel text-[26px] text-[#ff6b5a]">
                  {scores.scoreB ?? '—'}
                </p>
              </div>
            </div>
          </div>
        </aside>

        <div className="col-span-full flex items-center justify-between gap-3 border-t border-paper/10 pt-3">
          <p className="font-mono text-[11px] text-paper/40">
            {running
              ? 'Live Sepolia run in progress'
              : 'Gas only on Run · scenes are free to tour'}
          </p>
          <div className="hidden h-1 flex-1 max-w-xs overflow-hidden bg-paper/10 sm:block">
            <div
              className="h-full bg-paper/70 transition-[width] duration-500"
              style={{
                width: running
                  ? `${Math.min(100, (STEPS.findIndex((s) => s.id === stepId) / (STEPS.length - 2)) * 100)}%`
                  : previewId
                    ? `${((tourIndex + 1) / TOUR_STEPS.length) * 100}%`
                    : '0%',
              }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
