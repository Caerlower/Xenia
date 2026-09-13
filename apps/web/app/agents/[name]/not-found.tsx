import Link from 'next/link';

export default function AgentNotFound() {
  return (
    <div className="x-page flex min-h-[60dvh] flex-col items-start justify-center">
      <p className="x-eyebrow mb-3">
        <span className="x-dot" aria-hidden />
        Agent not found
      </p>
      <h1 className="x-pixel text-[36px] text-ink lg:text-[48px]">
        No agent matches
        <br />
        that link.
      </h1>
      <p className="mt-4 max-w-[42ch] text-[15px] leading-relaxed text-muted">
        Profiles use a full wallet address or an ENS name. Truncated addresses
        in the URL will not resolve. Search the directory or register a new
        agent.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/explore" className="x-btn-fill">
          Open directory
        </Link>
        <Link href="/agents/new" className="x-btn-ink">
          Register agent
        </Link>
        <Link href="/" className="x-text-link self-center">
          Back home
          <span aria-hidden>&gt;</span>
        </Link>
      </div>
    </div>
  );
}
