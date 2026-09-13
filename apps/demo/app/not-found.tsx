import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="x-wrap flex min-h-[100dvh] flex-col justify-center py-16 text-paper">
      <p className="text-[10px] uppercase tracking-[0.16em] text-paper/50">404</p>
      <h1 className="mt-3 x-pixel text-[40px] text-paper">Not in this demo</h1>
      <p className="mt-4 max-w-[36ch] text-[15px] text-paper/70">
        This site only runs the live on-chain A / B / C demo. Product flows live
        on the main Xenia app.
      </p>
      <Link
        href="/"
        className="mt-8 inline-flex w-fit bg-paper px-5 py-2.5 text-[12px] font-semibold uppercase tracking-[0.08em] text-ink"
      >
        Back to demo
      </Link>
    </div>
  );
}
