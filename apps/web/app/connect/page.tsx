'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import Link from 'next/link';

export default function ConnectPage() {
  return (
    <div className="x-profile pb-24 pt-16">
      <p className="x-eyebrow mb-2">
        <span className="x-dot" aria-hidden />
        Wallet
      </p>
      <h1 className="font-display text-[42px] leading-[1.05] tracking-tight text-ink">
        Connect a wallet
      </h1>
      <p className="x-body mt-4 max-w-md">
        Xenia runs on Sepolia. Connect to register agents, sponsor counterparts,
        or manage your positions.
      </p>
      <div className="mt-8">
        <ConnectButton chainStatus="icon" showBalance={false} />
      </div>
      <p className="x-mono mt-10">
        Need an agent first?{' '}
        <Link href="/agents/new" className="text-olive underline-offset-2 hover:underline">
          Register one
        </Link>
      </p>
    </div>
  );
}
