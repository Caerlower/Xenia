export type AgentSummary = {
  id: string;
  ensName: string | null;
  standingScore: number;
  inGoodStanding: boolean;
  premiumsPaidCount?: string;
  defaultsCount?: string;
  slashesCount?: string;
};

export type PremiumPayment = {
  amount: string;
  timestamp: string;
  backingId?: string;
};

export type ActiveBacking = {
  id: string;
  host: string;
  stakeAmount: string;
  premiumRate: string;
  status: string;
};

export type AgentProfile = AgentSummary & {
  premiumsPaidCount: string;
  defaultsCount: string;
  slashesCount: string;
  backings: ActiveBacking[];
  premiumPayments: PremiumPayment[];
};

/** Score formula mirror for breakdown UI only — authoritative score comes from subgraph. */
export function scoreBreakdown(agent: {
  premiumsPaidCount: string | number;
  defaultsCount: string | number;
  slashesCount: string | number;
}) {
  const premiums = Number(agent.premiumsPaidCount || 0);
  const defaults = Number(agent.defaultsCount || 0);
  const slashes = Number(agent.slashesCount || 0);
  const base = 50;
  const premiumBonus = premiums * 10;
  const defaultPenalty = defaults * -25;
  const slashPenalty = slashes * -40;
  const raw = base + premiumBonus + defaultPenalty + slashPenalty;
  // Same clamp as subgraph / @xenia/shared — standing never goes below 0 or above 100.
  const total = Math.max(0, Math.min(100, raw));
  const floorAdjustment = raw < 0 ? -raw : 0;
  const capAdjustment = raw > 100 ? 100 - raw : 0;
  return {
    base,
    premiumBonus,
    defaultPenalty,
    slashPenalty,
    raw,
    total,
    floorAdjustment,
    capAdjustment,
    premiums,
    defaults,
    slashes,
  };
}
