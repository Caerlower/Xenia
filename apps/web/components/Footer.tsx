import Link from 'next/link';
import { BrandMark } from '@/components/BrandMark';

export function Footer() {
  return (
    <footer className="border-t border-line bg-paper">
      <div className="x-wrap py-10">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <Link
              href="/"
              className="inline-flex items-center gap-2.5 text-ink"
              aria-label="Xenia home"
            >
              <BrandMark />
              <span className="x-pixel text-[24px] tracking-tight">xenia</span>
            </Link>
            <p className="mt-3 text-[13px] leading-relaxed text-muted">
              Ancient principle. Accountable intelligence.
            </p>
          </div>
          <nav
            className="flex flex-wrap gap-x-6 gap-y-2 text-[13px] text-muted sm:justify-end"
            aria-label="Footer navigation"
          >
            <Link href="/explore" className="hover:text-ink">
              Agents
            </Link>
            <Link href="/#how-it-works" className="hover:text-ink">
              How it works
            </Link>
            <Link href="/dashboard" className="hover:text-ink">
              My agents
            </Link>
          </nav>
        </div>
        <div className="mt-8 flex flex-col gap-2 border-t border-line pt-5 text-[11px] text-muted sm:flex-row sm:items-center sm:justify-between">
          <span>© 2026 Xenia Protocol. A promise worth keeping.</span>
          <span className="inline-flex items-center gap-2">
            <span className="x-dot" aria-hidden />
            Sepolia testnet · No real funds or insurance coverage
          </span>
        </div>
      </div>
    </footer>
  );
}
