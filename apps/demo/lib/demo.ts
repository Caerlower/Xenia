export type DemoAgent = {
  id: string;
  ensName: string | null;
  standingScore: number;
  inGoodStanding: boolean;
  premiumsPaidCount: string;
  defaultsCount: string;
  slashesCount: string;
  ensNode?: string | null;
};

export type DemoStatePayload = {
  live: boolean;
  network: { agents: number; slashes: number; lockedWei: string };
  agentA: DemoAgent | null;
  agentB: DemoAgent | null;
  story?: { title: string; summary: string };
};
