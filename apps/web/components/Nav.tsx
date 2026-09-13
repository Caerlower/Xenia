'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { BrandMark } from '@/components/BrandMark';

const LINKS = [
  { href: '/#how-it-works', label: 'How it works', match: null },
  { href: '/explore', label: 'Agents', match: '/explore' },
  { href: '/dashboard', label: 'My agents', match: '/dashboard' },
] as const;

export function Nav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 border-b border-ink/10 bg-paper/70 backdrop-blur-[10px]">
      <div className="x-wrap flex h-16 items-center justify-between gap-4 lg:h-[72px]">
        <Link
          href="/"
          className="inline-flex shrink-0 items-center gap-2.5 text-ink"
          aria-label="Xenia home"
        >
          <BrandMark className="h-7 w-6" />
          <span className="x-pixel text-[22px] tracking-tight lg:text-[26px]">
            xenia
          </span>
        </Link>

        <nav
          className="ml-auto hidden items-center gap-7 lg:flex"
          aria-label="Primary"
        >
          {LINKS.map((link) => {
            const active = link.match
              ? pathname === link.match || pathname.startsWith(`${link.match}/`)
              : false;
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? 'page' : undefined}
                className={`text-[13px] transition-opacity duration-150 ${
                  active ? 'text-ink' : 'text-muted hover:text-ink'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
          <ConnectButton.Custom>
            {({
              account,
              chain,
              openAccountModal,
              openChainModal,
              openConnectModal,
              mounted,
            }) => {
              const ready = mounted;
              if (!ready) {
                return (
                  <span className="inline-block h-10 w-28 bg-line/60" aria-hidden />
                );
              }
              if (!account) {
                return (
                  <button
                    type="button"
                    onClick={openConnectModal}
                    className="x-btn-fill min-h-10 px-4 text-[12px]"
                  >
                    Connect wallet
                  </button>
                );
              }
              if (chain?.unsupported) {
                return (
                  <button
                    type="button"
                    onClick={openChainModal}
                    className="x-btn-ghost min-h-10 text-[12px] text-red"
                  >
                    Wrong network
                  </button>
                );
              }
              return (
                <button
                  type="button"
                  onClick={openAccountModal}
                  className="x-btn-ink min-h-10 px-4 font-mono text-[12px]"
                >
                  {account.displayName}
                </button>
              );
            }}
          </ConnectButton.Custom>
        </nav>

        <div className="flex items-center gap-2 lg:hidden">
          <ConnectButton.Custom>
            {({ account, openConnectModal, openAccountModal, mounted }) => {
              if (!mounted) return null;
              if (!account) {
                return (
                  <button
                    type="button"
                    onClick={openConnectModal}
                    className="x-btn-fill min-h-9 px-3 text-[11px]"
                  >
                    Connect
                  </button>
                );
              }
              return (
                <button
                  type="button"
                  onClick={openAccountModal}
                  className="x-btn-ink min-h-9 px-3 font-mono text-[11px]"
                >
                  {account.displayName}
                </button>
              );
            }}
          </ConnectButton.Custom>
          <button
            type="button"
            className="grid h-9 w-9 place-items-center border border-line"
            aria-expanded={open}
            aria-label={open ? 'Close menu' : 'Open menu'}
            onClick={() => setOpen((v) => !v)}
          >
            <span className="sr-only">Menu</span>
            <span className="flex w-4 flex-col gap-1" aria-hidden>
              <span className="h-px w-full bg-ink" />
              <span className="h-px w-full bg-ink" />
            </span>
          </button>
        </div>
      </div>

      {open && (
        <nav
          className="absolute inset-x-0 top-full z-40 border-b border-line bg-paper px-5 py-4 shadow-[0_12px_24px_rgba(10,10,10,0.06)] lg:hidden"
          aria-label="Mobile"
        >
          <div className="flex flex-col gap-3">
            {LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="py-1 text-[14px] text-ink"
                onClick={() => setOpen(false)}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </nav>
      )}
    </header>
  );
}
