'use client';

import Link from 'next/link';
import { use, useEffect, useMemo, useState } from 'react';
import {
  useAccount,
  useWaitForTransactionReceipt,
  useWriteContract,
} from 'wagmi';
import { parseEther } from 'viem';
import { asAddress, formatEth, REGISTRY_ADDRESS, XENIA_ABI } from '@/lib/format';

export default function BackAgentPage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const { name: rawName } = use(params);
  const name = decodeURIComponent(rawName);
  const display = name.replace(/\.xenia\.eth$/i, '');
  const lookup =
    display.startsWith('0x') && display.length === 42
      ? display.toLowerCase()
      : display.includes('.')
        ? display
        : `${display}.xenia.eth`;

  const { isConnected } = useAccount();
  const [agentId, setAgentId] = useState(
    display.startsWith('0x') && display.length === 42 ? display.toLowerCase() : '',
  );
  const [stake, setStake] = useState('0.05');
  const [premium, setPremium] = useState('0.001');
  const { writeContract, data: hash, isPending, error, reset } =
    useWriteContract();
  const { isLoading: confirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const stakeWei = useMemo(() => {
    try {
      return parseEther(stake || '0');
    } catch {
      return 0n;
    }
  }, [stake]);

  const premiumWei = useMemo(() => {
    try {
      return parseEther(premium || '0');
    } catch {
      return 0n;
    }
  }, [premium]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (display.startsWith('0x') && display.length === 42) {
        if (!cancelled) setAgentId(display.toLowerCase());
        return;
      }
      const res = await fetch(`/api/standing?q=${encodeURIComponent(lookup)}`);
      const json = await res.json();
      if (!cancelled && json.agent?.id) setAgentId(json.agent.id);
    })();
    return () => {
      cancelled = true;
    };
  }, [display, lookup]);

  function submit() {
    const agent = asAddress(agentId);
    if (!agent || stakeWei <= 0n) return;
    reset();
    writeContract({
      address: REGISTRY_ADDRESS,
      abi: XENIA_ABI,
      functionName: 'createBacking',
      args: [agent, stakeWei, premiumWei],
      value: stakeWei,
    });
  }

  return (
    <div className="x-profile pb-24 pt-10">
      <p className="x-label">
        <Link
          href={`/agents/${encodeURIComponent(display)}`}
          className="hover:text-ink"
        >
          ← {display}
        </Link>
      </p>
      <h1 className="mt-3 font-display text-[36px] leading-[1.12] text-ink bp:text-[42px]">
        Back this agent
      </h1>
      <p className="x-mono mt-2">{lookup}</p>

      <div className="mt-10 max-w-md space-y-6">
        <div>
          <label htmlFor="stake" className="x-label">
            Stake amount (ETH)
          </label>
          <input
            id="stake"
            className="mt-2 w-full rounded-card border border-[var(--border)] bg-surface px-4 py-3 font-mono text-[14px] text-bronze outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-olive"
            value={stake}
            onChange={(e) => setStake(e.target.value)}
            inputMode="decimal"
          />
        </div>
        <div>
          <label htmlFor="premium" className="x-label">
            Premium rate (ETH per period)
          </label>
          <input
            id="premium"
            className="mt-2 w-full rounded-card border border-[var(--border)] bg-surface px-4 py-3 font-mono text-[14px] text-bronze outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-olive"
            value={premium}
            onChange={(e) => setPremium(e.target.value)}
            inputMode="decimal"
          />
        </div>

        <div className="rounded-card border border-[var(--border-strong)] bg-surface p-5">
          <p className="text-[15px] font-medium text-ink">
            You&apos;re staking {stake || '0'} ETH. If this agent defaults, you
            lose it.
          </p>
          <p className="x-body mt-2 text-[13px]">
            Premium due each period:{' '}
            <span className="font-mono text-bronze">
              {formatEth(premiumWei.toString())}
            </span>
          </p>
        </div>

        {error && <p className="text-[14px] text-clay">{error.message}</p>}

        {!isConnected ? (
          <Link href="/connect" className="x-btn-ink inline-flex">
            Connect wallet
          </Link>
        ) : isSuccess && hash ? (
          <div className="space-y-3">
            <p className="font-medium text-olive">Backing submitted.</p>
            <p className="x-mono break-all">{hash}</p>
            <Link
              href={`/agents/${encodeURIComponent(display)}`}
              className="x-btn-ghost inline-flex"
            >
              Back to profile
            </Link>
          </div>
        ) : (
          <button
            type="button"
            className="x-btn-ink"
            disabled={isPending || confirming || !agentId || stakeWei <= 0n}
            onClick={submit}
          >
            {isPending || confirming
              ? 'Confirm in wallet…'
              : !agentId
                ? 'Resolving agent…'
                : 'Sign & stake'}
          </button>
        )}
      </div>
    </div>
  );
}
