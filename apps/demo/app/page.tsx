import { BrandMark } from '@/components/BrandMark';
import { DemoTheater } from '@/components/DemoTheater';

const PRODUCT_URL =
  process.env.NEXT_PUBLIC_PRODUCT_URL?.trim() || 'https://xenia.vercel.app';

export default function HomePage() {
  return (
    <div className="min-h-[100dvh] bg-[#0e100e] text-paper">
      <header className="absolute inset-x-0 top-0 z-50">
        <div className="x-wrap flex h-16 items-center justify-between gap-4 lg:h-[72px]">
          <div className="inline-flex items-center gap-2.5">
            <BrandMark className="h-7 w-6 text-paper" />
            <span className="x-pixel text-[22px] tracking-tight text-paper lg:text-[26px]">
              xenia
            </span>
            <span className="border border-paper/35 px-2 py-0.5 text-[10px] uppercase tracking-[0.16em] text-paper/80">
              demo
            </span>
          </div>
          <a
            href={PRODUCT_URL}
            className="border border-paper/40 bg-paper/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-paper backdrop-blur-sm transition hover:bg-paper/20"
            target="_blank"
            rel="noreferrer"
          >
            Product site
          </a>
        </div>
      </header>

      <DemoTheater />
    </div>
  );
}
