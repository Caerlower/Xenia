# Xenia

**Slashable-stake trust for AI agents** — named after the ancient Greek code of guest-friendship (*xenia*).

Hosts stake collateral behind guest agents. Guests pay an ongoing trust fee. Harm opens a dispute window; unresolved default **slashes** stake to the victim. Standing scores make outcomes readable to humans, agents, and paywalled APIs.

> ETHGlobal Online · **ENS** · **The Graph** · **Hedera (x402)** · Sepolia

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](./LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D20-brightgreen)](./package.json)
[![pnpm](https://img.shields.io/badge/pnpm-10-orange)](./package.json)

---

## Table of contents

- [Why Xenia](#why-xenia)
- [Sponsor stack](#sponsor-stack-ens--the-graph--hedera)
- [Architecture](#architecture)
- [Repository structure](#repository-structure)
- [Status](#status)
- [Quick start](#quick-start)
- [Scripts](#scripts)
- [Deployments](#deployments)
- [Hosting](#hosting)
- [Security](#security)
- [License](#license)

---

## Why Xenia

Autonomous agents transact without shared legal identity. Xenia gives them a **portable trust deposit**:

1. Register an agent identity (`*.xenia.eth` namehash on-chain)
2. A host locks ETH behind that agent
3. The agent pays premiums to keep coverage active
4. Counterparties can report default → short dispute → slash or clear
5. Standing is indexed and queryable so the next counterparty can decide **transact / refuse**

---

## Sponsor stack: ENS · The Graph · Hedera

Xenia splits concerns across three sponsors on purpose. Protocol state stays on Ethereum Sepolia; identity, indexing, and micropayments each use the right network.

```text
                         ┌──────────────────────┐
                         │   Human / Agent UI   │
                         │  apps/web · apps/demo│
                         │     apps/mcp (opt)   │
                         └──────────┬───────────┘
              ┌─────────────────────┼─────────────────────┐
              ▼                     ▼                     ▼
     ┌────────────────┐   ┌─────────────────┐   ┌──────────────────┐
     │      ENS       │   │   The Graph     │   │     Hedera       │
     │  identity +    │   │  indexed trust  │   │  x402 micropay   │
     │  host-only EAC │   │  standing graph │   │  for API access  │
     └───────┬────────┘   └────────┬────────┘   └────────┬─────────┘
             │ namehash            │ events               │ HBAR pay
             ▼                     ▼                      ▼
     ┌──────────────────────────────────────┐    ┌─────────────────┐
     │         XeniaRegistry (Sepolia)      │    │ apps/api :4021  │
     │  register · back · premium · slash   │───►│ POST /xenia/    │
     └──────────────────────────────────────┘    │ check (402→pay) │
                                                 └─────────────────┘
```

### ENS — portable agent identity

| Piece | How Xenia uses it |
| --- | --- |
| Parent name | `xenia.eth` on Sepolia (ENSv2) |
| On-chain link | `XeniaRegistry.registerAgent(bytes32 ensNode)` stores the **namehash** of `label.xenia.eth` |
| Subnames | `packages/ens` registers `agent-a/b/c.xenia.eth` via permissioned UserRegistry |
| Trust metadata | Text records: `xenia.host`, `xenia.stake`, `xenia.premiumStatus`, `xenia.backingId` |
| Enhanced Access Control | Only the **host** may edit backing text keys (`pnpm ens:eac` proves non-host fails) |
| Product / demo UX | Profiles and Run flows resolve `*.xenia.eth` ↔ wallet via namehash + subgraph hydration |

ENS is the **human- and agent-readable handle**. The registry binds that handle to slashable stake; EAC keeps sponsor-controlled records honest.

```bash
pnpm ens:register    # mint agent-*.xenia.eth subnames
pnpm ens:backing     # write backing text records
pnpm ens:eac         # host-only edit demo
```

### The Graph — indexed trust graph

| Piece | How Xenia uses it |
| --- | --- |
| Network | Sepolia (`packages/subgraph`) |
| Source | `XeniaRegistry` events: register, backing, premium, default, slash, revoke |
| Entities | `Agent`, `Backing`, payments, defaults, slashes |
| Consumers | `apps/web` directory & standing APIs, `apps/demo` ledger snapshot, `apps/mcp` `check_agent_standing`, paid API after x402 settle |
| Standing | Scores derived from premiums / defaults / slashes (shared helpers in `@xenia/shared`) |

The Graph is the **read path**. Writes go to Sepolia; UIs and agents never scrape RPC logs for product queries.

```bash
pnpm build:subgraph          # codegen + build
# then publish from packages/subgraph via Graph Studio
```

Studio query (update after each registry redeploy):

`https://api.studio.thegraph.com/query/1760224/xenia-registry/version/latest`

### Hedera — x402 micropayments for standing checks

| Piece | How Xenia uses it |
| --- | --- |
| Why Hedera | Fast, cheap settlement for **API access**, not for the stake ledger |
| Protocol | [x402](https://www.x402.org/) HTTP payment required (402) → pay → retry |
| Stack | `apps/api` + `@x402/core` + `@x402/hedera` + Blocky402 facilitator |
| Flow | `POST /xenia/check` without `PAYMENT-SIGNATURE` → **HTTP 402** + accepts; with payment → standing payload (from subgraph / on-chain) |
| Asset / net | ~0.001 HBAR on **Hedera testnet** |
| Separation | Stake, slash, and ENS stay on Sepolia — Hedera never holds the trust deposit |

This is the **pay-per-request** layer for agent tooling: you don’t need a prepaid API key; you pay HBAR when you ask for standing.

```bash
pnpm dev:api           # http://localhost:4021
pnpm smoke:x402        # unpaid check must return 402
```

> **Status:** x402 service is implemented and smoke-tested for the 402 gate; full product UI wiring is still WIP. Web register/vouch and demo Run do **not** require Hedera — they use Sepolia wallets / the host funder key.

---

## Architecture

### Protocol lifecycle (Sepolia)

1. **Register** — `registerAgent(ensNode)`
2. **Back** — host `createBacking{value: stake}(agent, stake, premiumRate)`
3. **Trust fee** — agent `payPremium{value: premiumRate}(backingId)`
4. **Default** — `reportDefault` → Disputed
5. **Window** — immutable `DISPUTE_WINDOW` (current demo deploy: **10s**)
6. **Resolve** — `resolveDispute` → slash to victim or clear
7. **Index + decide** — subgraph / MCP / optional paid API → transact or refuse

### Runtime diagram

```text
apps/web  ──wallet txs──►  XeniaRegistry (Sepolia)
    │                            │
    └──── GraphQL ───────────────┤
                                 │ events
apps/demo ──SSE Run──► packages/demo orchestrator
    │         (host key funds fresh agents)
    └──── GraphQL ───────────────┤
                                 ▼
                          The Graph subgraph
                                 │
                    ┌────────────┴────────────┐
                    ▼                         ▼
               apps/mcp (opt)          apps/api (opt)
                                       x402 → Hedera settle
                                       then return standing
```

| Layer | Responsibility | Network |
| --- | --- | --- |
| `XeniaRegistry` | Stake, premium, dispute, slash | Ethereum Sepolia |
| ENS | Names, text records, host-only EAC | Sepolia (ENSv2) |
| Subgraph | Indexed agents & standing inputs | The Graph → Sepolia |
| `apps/web` | Product UI (RainbowKit) | Sepolia |
| `apps/demo` | Narrative on-chain Run | Sepolia (server-funded) |
| `apps/api` | Paid standing check | Hedera testnet (x402) |
| `apps/mcp` | Agent tool: `check_agent_standing` | Subgraph |

More detail: [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md).

---

## Repository structure

```text
xenia/
├── apps/
│   ├── web/              # Product app (Next.js) → xenia.vercel.app
│   ├── demo/             # On-chain demo theater → demo.xenia.vercel.app
│   ├── api/              # Hedera x402 Fastify service (WIP wiring)
│   └── mcp/              # Standing MCP server (optional)
├── packages/
│   ├── shared/           # ABI + standing helpers
│   ├── config/           # Root .env loader
│   ├── demo/             # Sepolia orchestrator (Run button)
│   ├── ens/              # ENSv2 subname + EAC scripts
│   └── subgraph/         # The Graph manifests + mappings
├── contracts/            # Foundry — XeniaRegistry.sol
├── docs/                 # Architecture & contributing
├── .env.example
├── pnpm-workspace.yaml
└── README.md
```

Monorepo tool: **pnpm** workspaces · Node **≥ 20**.

---

## Status

| Area | State | Notes |
| --- | --- | --- |
| `contracts/` | **Ready** | Sepolia deploy, 10s dispute window |
| `packages/subgraph` | **Ready** | Republish Studio after registry changes |
| `packages/ens` | **Ready (scripts)** | Register / backing records / EAC demo |
| `apps/web` | **Ready** | Register, sponsor, standing UI |
| `apps/demo` + `packages/demo` | **Ready** | Full-bleed theater + Run |
| `apps/api` (Hedera x402) | **Implemented / WIP UX** | 402 gate works; not yet product-wired |
| `apps/mcp` | **Implemented / WIP E2E** | Subgraph standing tool |

---

## Quick start

```bash
corepack enable && corepack prepare pnpm@10.13.1 --activate
cp .env.example .env
cp apps/web/.env.example apps/web/.env.local
# Sepolia RPC + funded key + SUBGRAPH_URL + WalletConnect project id
# Optional Hedera: HEDERA_SERVICE_ACCOUNT_ID / HEDERA_SERVICE_PRIVATE_KEY

pnpm install
pnpm test:contracts

pnpm dev:web                  # http://localhost:3000
pnpm dev:demo                 # http://localhost:3001
```

Optional sponsor demos:

```bash
pnpm ens:register && pnpm ens:backing && pnpm ens:eac
pnpm dev:api && pnpm smoke:x402
pnpm dev:mcp
```

### Demo Run requirements

| Variable | Purpose |
| --- | --- |
| `XENIA_REGISTRY_ADDRESS` | Current Sepolia registry |
| `HOST_PRIVATE_KEY` / `PRIVATE_KEY` | Funds fresh agents each Run |
| `DISPUTE_WINDOW_MS=10000` | Must match on-chain window |
| `STAKE_WEI` / `DEMO_GAS_WEI` | Keep ≤ ~0.005 ETH per run for faucets |
| `SUBGRAPH_URL` | Indexed standing (on-chain fallback if lagging) |

---

## Scripts

| Command | Purpose |
| --- | --- |
| `pnpm dev:web` | Product app (:3000) |
| `pnpm dev:demo` | Demo theater (:3001) |
| `pnpm demo` | CLI A→B→C orchestrator |
| `pnpm test:contracts` | Foundry tests |
| `pnpm build:contracts` | `forge build` |
| `pnpm build:subgraph` | Graph codegen + build |
| `pnpm ens:register` | ENS subnames under `xenia.eth` |
| `pnpm ens:backing` | Backing text records |
| `pnpm ens:eac` | Host-only EAC proof |
| `pnpm dev:api` / `smoke:x402` | Hedera x402 service |
| `pnpm dev:mcp` | Standing MCP |

---

## Deployments

### Sepolia — protocol + ENS

| Resource | Value |
| --- | --- |
| `XeniaRegistry` | [`0x8B71cd2dfDD7b8F774c84fF977EDF7839ceFDF28`](https://sepolia.etherscan.io/address/0x8B71cd2dfDD7b8F774c84fF977EDF7839ceFDF28) |
| Dispute window | **10 seconds** |
| Deploy tx | [`0xf8f5ae…e629`](https://sepolia.etherscan.io/tx/0xf8f5ae46435bfbff0fdd561e27ec00e269dc475af595b1b3d9cfeda66dede629) |
| Start block | `11695254` |
| ENS parent | `xenia.eth` |
| UserRegistry | `0xBb6Cdc52E71e25096Cb457237e3CcA220EC911a4` |
| Resolver | `0x8e3a29263B8d016f3D56daf98ABcAAbAf996C889` |

### The Graph

| Resource | Value |
| --- | --- |
| Subgraph | `xenia-registry` (Studio) |
| Query URL | `https://api.studio.thegraph.com/query/1760224/xenia-registry/version/latest` |

Repoint `subgraph.yaml` / `networks.json` and republish after any registry redeploy.

### Hedera

| Resource | Value |
| --- | --- |
| Network | Hedera testnet |
| Facilitator | Blocky402 (`https://api.blocky402.com`) |
| Local service | `POST http://localhost:4021/xenia/check` |

---

## Hosting

| App | Suggested host | Notes |
| --- | --- | --- |
| `apps/web` | Vercel | Users pay Sepolia gas |
| `apps/demo` UI | Vercel | Tour works without secrets |
| Demo **Run** | Railway / Fly / VPS | Long-lived Node + host key |
| `apps/api` | Node host | Hedera x402 + facilitator |
| Subgraph | Graph Studio | Indexer SaaS |

---

## Security

- Never commit `.env`, `.env.local`, or private keys
- Demo **Run** spends the host key — rate-limit and faucet-monitor if public
- `DISPUTE_WINDOW` is immutable per deploy; change it only by redeploying
- ENS EAC: treat host-only text keys as the source of truth for off-chain backing metadata
- x402: verify facilitator responses server-side before returning standing

See also [`docs/CONTRIBUTING.md`](./docs/CONTRIBUTING.md).

---

## License

MIT © Xenia contributors — see [LICENSE](./LICENSE).
