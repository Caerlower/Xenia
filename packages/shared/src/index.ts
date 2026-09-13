export const XENIA_REGISTRY_ABI = [
  {
    type: "constructor",
    inputs: [{ name: "disputeWindowSeconds", type: "uint256", internalType: "uint256" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "registerAgent",
    inputs: [{ name: "ensNode", type: "bytes32", internalType: "bytes32" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "createBacking",
    inputs: [
      { name: "agent", type: "address", internalType: "address" },
      { name: "stakeAmount", type: "uint256", internalType: "uint256" },
      { name: "premiumRate", type: "uint256", internalType: "uint256" },
    ],
    outputs: [{ name: "backingId", type: "bytes32", internalType: "bytes32" }],
    stateMutability: "payable",
  },
  {
    type: "function",
    name: "payPremium",
    inputs: [{ name: "backingId", type: "bytes32", internalType: "bytes32" }],
    outputs: [],
    stateMutability: "payable",
  },
  {
    type: "function",
    name: "reportDefault",
    inputs: [
      { name: "backingId", type: "bytes32", internalType: "bytes32" },
      { name: "counterparty", type: "address", internalType: "address" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "resolveDispute",
    inputs: [
      { name: "backingId", type: "bytes32", internalType: "bytes32" },
      { name: "defaulted", type: "bool", internalType: "bool" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "revokeBacking",
    inputs: [{ name: "backingId", type: "bytes32", internalType: "bytes32" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "isInGoodStanding",
    inputs: [{ name: "agent", type: "address", internalType: "address" }],
    outputs: [{ name: "", type: "bool", internalType: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getBacking",
    inputs: [{ name: "backingId", type: "bytes32", internalType: "bytes32" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        internalType: "struct XeniaRegistry.Backing",
        components: [
          { name: "id", type: "bytes32", internalType: "bytes32" },
          { name: "agent", type: "address", internalType: "address" },
          { name: "host", type: "address", internalType: "address" },
          { name: "stakeAmount", type: "uint256", internalType: "uint256" },
          { name: "premiumRate", type: "uint256", internalType: "uint256" },
          { name: "premiumsPaid", type: "uint256", internalType: "uint256" },
          { name: "lastPremiumAt", type: "uint256", internalType: "uint256" },
          { name: "status", type: "uint8", internalType: "enum XeniaRegistry.BackingStatus" },
          { name: "counterparty", type: "address", internalType: "address" },
          { name: "disputeOpenedAt", type: "uint256", internalType: "uint256" },
          { name: "createdAt", type: "uint256", internalType: "uint256" },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "event",
    name: "AgentRegistered",
    inputs: [
      { name: "agent", type: "address", indexed: true, internalType: "address" },
      { name: "ensNode", type: "bytes32", indexed: true, internalType: "bytes32" },
      { name: "timestamp", type: "uint256", indexed: false, internalType: "uint256" },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "BackingCreated",
    inputs: [
      { name: "backingId", type: "bytes32", indexed: true, internalType: "bytes32" },
      { name: "agent", type: "address", indexed: true, internalType: "address" },
      { name: "host", type: "address", indexed: true, internalType: "address" },
      { name: "stakeAmount", type: "uint256", indexed: false, internalType: "uint256" },
      { name: "premiumRate", type: "uint256", indexed: false, internalType: "uint256" },
      { name: "timestamp", type: "uint256", indexed: false, internalType: "uint256" },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "PremiumPaid",
    inputs: [
      { name: "backingId", type: "bytes32", indexed: true, internalType: "bytes32" },
      { name: "agent", type: "address", indexed: true, internalType: "address" },
      { name: "host", type: "address", indexed: true, internalType: "address" },
      { name: "amount", type: "uint256", indexed: false, internalType: "uint256" },
      { name: "premiumsPaidTotal", type: "uint256", indexed: false, internalType: "uint256" },
      { name: "timestamp", type: "uint256", indexed: false, internalType: "uint256" },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "DefaultReported",
    inputs: [
      { name: "backingId", type: "bytes32", indexed: true, internalType: "bytes32" },
      { name: "agent", type: "address", indexed: true, internalType: "address" },
      { name: "host", type: "address", indexed: true, internalType: "address" },
      { name: "counterparty", type: "address", indexed: false, internalType: "address" },
      { name: "stakeAmount", type: "uint256", indexed: false, internalType: "uint256" },
      { name: "disputeDeadline", type: "uint256", indexed: false, internalType: "uint256" },
      { name: "timestamp", type: "uint256", indexed: false, internalType: "uint256" },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "StakeSlashed",
    inputs: [
      { name: "backingId", type: "bytes32", indexed: true, internalType: "bytes32" },
      { name: "agent", type: "address", indexed: true, internalType: "address" },
      { name: "host", type: "address", indexed: true, internalType: "address" },
      { name: "counterparty", type: "address", indexed: false, internalType: "address" },
      { name: "slashAmount", type: "uint256", indexed: false, internalType: "uint256" },
      { name: "timestamp", type: "uint256", indexed: false, internalType: "uint256" },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "DisputeResolved",
    inputs: [
      { name: "backingId", type: "bytes32", indexed: true, internalType: "bytes32" },
      { name: "agent", type: "address", indexed: true, internalType: "address" },
      { name: "host", type: "address", indexed: true, internalType: "address" },
      { name: "defaulted", type: "bool", indexed: false, internalType: "bool" },
      { name: "timestamp", type: "uint256", indexed: false, internalType: "uint256" },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "BackingRevoked",
    inputs: [
      { name: "backingId", type: "bytes32", indexed: true, internalType: "bytes32" },
      { name: "agent", type: "address", indexed: true, internalType: "address" },
      { name: "host", type: "address", indexed: true, internalType: "address" },
      { name: "stakeReturned", type: "uint256", indexed: false, internalType: "uint256" },
      { name: "timestamp", type: "uint256", indexed: false, internalType: "uint256" },
    ],
    anonymous: false,
  },
] as const;

export type StandingResult = {
  agentId: string;
  ensName?: string | null;
  hosts: Array<{
    host: string;
    backingId: string;
    stakeAmount: string;
    premiumRate: string;
    status: string;
  }>;
  premiumPaymentHistory: Array<{
    backingId: string;
    amount: string;
    timestamp: string;
  }>;
  defaultHistory: Array<{
    backingId: string;
    counterparty: string;
    timestamp: string;
  }>;
  slashHistory: Array<{
    backingId: string;
    counterparty: string;
    amount: string;
    timestamp: string;
  }>;
  standingScore: number;
  inGoodStanding: boolean;
};

export function computeStandingScore(input: {
  premiumsPaidOnTime: number;
  defaults: number;
  slashes: number;
}): number {
  // Simple demo score: start at 50, +10 per on-time premium, -25 default, -40 slash. Clamp 0–100.
  const raw = 50 + input.premiumsPaidOnTime * 10 - input.defaults * 25 - input.slashes * 40;
  return Math.max(0, Math.min(100, raw));
}
