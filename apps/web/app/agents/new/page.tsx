'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  useAccount,
  useWaitForTransactionReceipt,
  useWriteContract,
} from 'wagmi';
import { namehash } from 'viem';
import { REGISTRY_ADDRESS, XENIA_ABI } from '@/lib/format';

const steps = ['Name', 'Confirm wallet', 'Register'] as const;

export default function NewAgentPage() {
  const { address, isConnected } = useAccount();
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const { writeContract, data: hash, isPending, error, reset } =
    useWriteContract();
  const { isLoading: confirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const ens = useMemo(() => {
    const bare = name
      .trim()
      .toLowerCase()
      .replace(/\.xenia\.eth$/i, '')
      .replace(/[^a-z0-9-]/g, '');
    return bare ? `${bare}.xenia.eth` : '';
  }, [name]);

  function register() {
    if (!ens) return;
    reset();
    writeContract({
      address: REGISTRY_ADDRESS,
      abi: XENIA_ABI,
      functionName: 'registerAgent',
      args: [namehash(ens)],
    });
  }

  return (
    <div className="x-profile pb-24 pt-10">
      <p className="x-label">
        Step {step + 1} of {steps.length} — {steps[step]}
      </p>
      <h1 className="mt-3 font-display text-[36px] leading-[1.12] text-ink bp:text-[42px]">
        Create an agent
      </h1>

      {step === 0 && (
        <div className="mt-10 max-w-md">
          <label htmlFor="agent-name" className="x-label">
            Agent name
          </label>
          <input
            id="agent-name"
            className="mt-2 w-full rounded-card border border-[var(--border)] bg-surface px-4 py-3 font-mono text-[14px] outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-olive"
            placeholder="agent-a"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="off"
            spellCheck={false}
          />
          <p className="x-mono mt-3">
            Resolves to{' '}
            <span className="text-ink">{ens || '—.xenia.eth'}</span>
          </p>
          <button
            type="button"
            className="x-btn-olive mt-8"
            disabled={!ens}
            onClick={() => setStep(1)}
          >
            Continue
          </button>
        </div>
      )}

      {step === 1 && (
        <div className="mt-10 max-w-md">
          <p className="x-body">
            You’ll register{' '}
            <span className="font-mono text-[14px] text-ink">{ens}</span> from
            the connected wallet. That wallet becomes the agent identity
            on-chain.
          </p>
          <p className="x-mono mt-4">
            {isConnected ? short(address) : 'Wallet not connected'}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <button
              type="button"
              className="x-btn-ghost"
              onClick={() => setStep(0)}
            >
              Back
            </button>
            {isConnected ? (
              <button
                type="button"
                className="x-btn-olive"
                onClick={() => setStep(2)}
              >
                Confirm wallet
              </button>
            ) : (
              <Link href="/connect" className="x-btn-ink">
                Connect wallet
              </Link>
            )}
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="mt-10 max-w-md">
          <p className="x-body">
            Register <span className="font-mono text-ink">{ens}</span> on
            Sepolia. This sends a transaction to the Xenia registry.
          </p>
          {error && (
            <p className="mt-4 text-[14px] text-clay">{error.message}</p>
          )}
          {isSuccess && hash ? (
            <div className="mt-8 space-y-4">
              <p className="font-medium text-olive">Registered on-chain.</p>
              <p className="x-mono break-all">{hash}</p>
              <Link
                href={`/agents/${encodeURIComponent(ens.replace(/\.xenia\.eth$/, ''))}`}
                className="x-btn-ink inline-flex"
              >
                Open agent profile
              </Link>
            </div>
          ) : (
            <div className="mt-8 flex flex-wrap gap-3">
              <button
                type="button"
                className="x-btn-ghost"
                onClick={() => setStep(1)}
              >
                Back
              </button>
              <button
                type="button"
                className="x-btn-olive"
                disabled={isPending || confirming}
                onClick={register}
              >
                {isPending || confirming ? 'Confirm in wallet…' : 'Register agent'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function short(addr?: string) {
  if (!addr) return '—';
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}
