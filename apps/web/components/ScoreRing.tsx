export function ScoreRing({
  score,
  slashed,
}: {
  score: number;
  slashed: boolean;
}) {
  const pct = Math.min(100, Math.max(0, score));
  const color = slashed ? '#c43c2c' : '#0a0a0a';

  return (
    <div
      className="relative h-[154px] w-[154px] shrink-0 rounded-full"
      style={{
        background: `conic-gradient(${color} ${pct * 3.6}deg, #d5d8d5 0deg)`,
      }}
      aria-hidden
    >
      <div className="absolute inset-[10px] flex flex-col items-center justify-center rounded-full bg-surface">
        <strong
          className={`x-pixel text-[42px] leading-none ${
            slashed ? 'text-red' : 'text-ink'
          }`}
        >
          {score}
        </strong>
        <span className="mt-1 text-[8px] uppercase tracking-[0.14em] text-muted">
          Score
        </span>
      </div>
    </div>
  );
}
