export function BrandMark({ className = 'h-7 w-6' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 30 34"
      aria-hidden="true"
      fill="currentColor"
    >
      <path d="M2 2h9l4 9 4-9h9L19 17l9 15h-9l-4-9-4 9H2l9-15z" />
      <path
        d="M6 5l18 24M24 5L6 29"
        stroke="currentColor"
        strokeWidth="0.7"
        fill="none"
        opacity="0.35"
      />
    </svg>
  );
}
