import {
  AgentRegistered,
  BackingCreated,
  PremiumPaid,
  DefaultReported,
  StakeSlashed,
  DisputeResolved,
  BackingRevoked,
} from "../generated/XeniaRegistry/XeniaRegistry";
import { Agent, Backing, PremiumPayment, DefaultReport, SlashEvent } from "../generated/schema";
import { Address, BigInt } from "@graphprotocol/graph-ts";

function agentId(addr: Address): string {
  return addr.toHexString().toLowerCase();
}

function computeStanding(premiums: BigInt, defaults: BigInt, slashes: BigInt): i32 {
  // standingScore = clamp(50 + 10*premiums - 25*defaults - 40*slashes, 0, 100)
  let raw =
    50 +
    premiums.toI32() * 10 -
    defaults.toI32() * 25 -
    slashes.toI32() * 40;
  if (raw < 0) return 0;
  if (raw > 100) return 100;
  return raw as i32;
}

function ensureAgent(addr: Address, timestamp: BigInt): Agent {
  let id = agentId(addr);
  let agent = Agent.load(id);
  if (agent == null) {
    agent = new Agent(id);
    agent.wallet = addr;
    agent.registeredAt = timestamp;
    agent.premiumsPaidCount = BigInt.fromI32(0);
    agent.defaultsCount = BigInt.fromI32(0);
    agent.slashesCount = BigInt.fromI32(0);
    agent.standingScore = 50;
    agent.inGoodStanding = false;
    agent.updatedAt = timestamp;
  }
  return agent;
}

function refreshStanding(agent: Agent, timestamp: BigInt): void {
  agent.standingScore = computeStanding(
    agent.premiumsPaidCount,
    agent.defaultsCount,
    agent.slashesCount
  );
  agent.updatedAt = timestamp;
}

export function handleAgentRegistered(event: AgentRegistered): void {
  let agent = ensureAgent(event.params.agent, event.params.timestamp);
  agent.ensNode = event.params.ensNode;
  agent.registeredAt = event.params.timestamp;
  agent.updatedAt = event.params.timestamp;
  agent.save();
}

export function handleBackingCreated(event: BackingCreated): void {
  let agent = ensureAgent(event.params.agent, event.params.timestamp);
  let backing = new Backing(event.params.backingId.toHexString());
  backing.agent = agent.id;
  backing.host = event.params.host;
  backing.stakeAmount = event.params.stakeAmount;
  backing.premiumRate = event.params.premiumRate;
  backing.premiumsPaid = BigInt.fromI32(0);
  backing.lastPremiumAt = event.params.timestamp;
  backing.status = "Active";
  backing.createdAt = event.params.timestamp;
  backing.save();

  agent.inGoodStanding = true;
  refreshStanding(agent, event.params.timestamp);
  agent.save();
}

export function handlePremiumPaid(event: PremiumPaid): void {
  let agent = ensureAgent(event.params.agent, event.params.timestamp);
  let backing = Backing.load(event.params.backingId.toHexString());
  if (backing == null) return;

  backing.premiumsPaid = event.params.premiumsPaidTotal;
  backing.lastPremiumAt = event.params.timestamp;
  backing.save();

  let payment = new PremiumPayment(
    event.transaction.hash.toHexString() + "-" + event.logIndex.toString()
  );
  payment.backing = backing.id;
  payment.agent = event.params.agent;
  payment.host = event.params.host;
  payment.amount = event.params.amount;
  payment.premiumsPaidTotal = event.params.premiumsPaidTotal;
  payment.timestamp = event.params.timestamp;
  payment.blockNumber = event.block.number;
  payment.transactionHash = event.transaction.hash;
  payment.save();

  agent.premiumsPaidCount = agent.premiumsPaidCount.plus(BigInt.fromI32(1));
  refreshStanding(agent, event.params.timestamp);
  agent.save();
}

export function handleDefaultReported(event: DefaultReported): void {
  let agent = ensureAgent(event.params.agent, event.params.timestamp);
  let backing = Backing.load(event.params.backingId.toHexString());
  if (backing == null) return;

  backing.status = "Disputed";
  backing.counterparty = event.params.counterparty;
  backing.disputeOpenedAt = event.params.timestamp;
  backing.save();

  let report = new DefaultReport(
    event.transaction.hash.toHexString() + "-" + event.logIndex.toString()
  );
  report.backing = backing.id;
  report.agent = event.params.agent;
  report.host = event.params.host;
  report.counterparty = event.params.counterparty;
  report.stakeAmount = event.params.stakeAmount;
  report.disputeDeadline = event.params.disputeDeadline;
  report.timestamp = event.params.timestamp;
  report.blockNumber = event.block.number;
  report.transactionHash = event.transaction.hash;
  report.save();

  agent.defaultsCount = agent.defaultsCount.plus(BigInt.fromI32(1));
  agent.inGoodStanding = false;
  refreshStanding(agent, event.params.timestamp);
  agent.save();
}

export function handleStakeSlashed(event: StakeSlashed): void {
  let agent = ensureAgent(event.params.agent, event.params.timestamp);
  let backing = Backing.load(event.params.backingId.toHexString());
  if (backing == null) return;

  backing.status = "Slashed";
  backing.stakeAmount = BigInt.fromI32(0);
  backing.counterparty = event.params.counterparty;
  backing.save();

  let slash = new SlashEvent(
    event.transaction.hash.toHexString() + "-" + event.logIndex.toString()
  );
  slash.backing = backing.id;
  slash.agent = event.params.agent;
  slash.host = event.params.host;
  slash.counterparty = event.params.counterparty;
  slash.slashAmount = event.params.slashAmount;
  slash.timestamp = event.params.timestamp;
  slash.blockNumber = event.block.number;
  slash.transactionHash = event.transaction.hash;
  slash.save();

  agent.slashesCount = agent.slashesCount.plus(BigInt.fromI32(1));
  agent.inGoodStanding = false;
  refreshStanding(agent, event.params.timestamp);
  agent.save();
}

export function handleDisputeResolved(event: DisputeResolved): void {
  let agent = ensureAgent(event.params.agent, event.params.timestamp);
  let backing = Backing.load(event.params.backingId.toHexString());
  if (backing == null) return;

  if (!event.params.defaulted) {
    backing.status = "Active";
    backing.counterparty = null;
    backing.disputeOpenedAt = null;
    backing.save();
    agent.inGoodStanding = true;
  }
  // If defaulted, StakeSlashed already set Slashed status.
  refreshStanding(agent, event.params.timestamp);
  agent.save();
}

export function handleBackingRevoked(event: BackingRevoked): void {
  let agent = ensureAgent(event.params.agent, event.params.timestamp);
  let backing = Backing.load(event.params.backingId.toHexString());
  if (backing == null) return;

  backing.status = "Revoked";
  backing.stakeAmount = BigInt.fromI32(0);
  backing.save();

  // Conservative: mark not in good standing until another Active backing exists.
  // For the demo each agent has one backing.
  agent.inGoodStanding = false;
  refreshStanding(agent, event.params.timestamp);
  agent.save();
}
