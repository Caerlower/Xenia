'use client';

import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';

function SearchIcon() {
  return (
    <svg
      className="h-4 w-4 shrink-0 text-muted"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden
    >
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3-3" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg
      className="h-3.5 w-3.5 text-ink"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden
    >
      <path d="M12 3l7 3v6c0 4.5-3.1 8.7-7 9.8C8.1 20.7 5 16.5 5 12V6l7-3z" />
    </svg>
  );
}

export function StandingCheck({
  initial = '',
  buttonLabel = 'Check standing',
}: {
  initial?: string;
  buttonLabel?: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState(initial);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const raw = value.trim().toLowerCase();
    if (!raw) return;
    const name = raw.endsWith('.xenia.eth')
      ? raw.replace(/\.xenia\.eth$/, '')
      : raw.replace(/\.eth$/, '');
    router.push(`/agents/${encodeURIComponent(name)}`);
  }

  return (
    <form onSubmit={onSubmit} className="w-full">
      <div className="mb-2 flex items-center justify-between gap-2">
        <label
          htmlFor="standing-query"
          className="text-[11px] font-medium text-ink"
        >
          Wallet address or ENS name
        </label>
        <ShieldIcon />
      </div>
      <div className="flex items-center gap-0 border border-line bg-surface p-1">
        <div className="flex min-w-0 flex-1 items-center gap-2 px-3">
          <SearchIcon />
          <input
            id="standing-query"
            className="x-input min-w-0 flex-1 py-2.5"
            placeholder="0x… or name.xenia.eth"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            autoComplete="off"
            spellCheck={false}
          />
        </div>
        <button
          type="submit"
          className="x-btn-fill shrink-0 whitespace-nowrap px-4 py-2 text-[12px]"
        >
          {buttonLabel}
        </button>
      </div>
    </form>
  );
}
