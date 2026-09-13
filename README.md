# Xenia

Slashable-stake trust for AI agents — named after the ancient Greek code of **guest-friendship** (*xenia*).

Built for **ETHGlobal Online** (Hedera · ENS · The Graph · AI tooling).

A **guest** agent is backed by a **host** who locks collateral. The guest pays an ongoing trust fee. Alleged harm opens a short dispute window; unresolved default **slashes** stake to the victim. Standing scores make the outcome readable to other agents and apps.

---

## Status

| Area | State | Notes |
| --- | --- | --- |
| `contracts/` | **Ready** | `XeniaRegistry` on Sepolia (10s dispute window for demos) |
| `packages/subgraph` | **Ready** | Update Studio deploy after registry changes |
| `apps/web` | **Ready** | Product UI: register, sponsor, standing |
| `apps/demo` + `packages/demo` | **Ready** | Full-bleed on-chain theater + Run orchestrator |
| `packages/ens` | **Partial** | Subname / EAC scripts |
| `apps/api` | **WIP** | Hedera x402 paywall — **not** wired into web/demo Run |
| `apps/mcp` | **WIP** | `check_agent_standing` — optional / untested E2E |

Core demo path = **contracts + subgraph + web + demo**. Treat API/MCP as sponsor-track extras until verified.

---

## Architecture

```text
┌─────────────────────────────────────────────────────────────┐
│  apps/web (product)          apps/demo (theater + Run)      │
│  wallet → Sepolia txs        SSE → packages/demo orchestrator│
└───────────────┬──────────────────────────┬──────────────────┘
                │                          │
                ▼                          ▼
        ┌───────────────┐         ┌────────────────┐
        │ XeniaRegistry │◄────────│ Host funder key│
        │   (Sepolia)   │         │ (demo Run only)│
        └───────┬───────┘         └────────────────┘
                │ events
                ▼
        ┌───────────────┐         ┌────────────────┐
        │  The Graph    │────────►│ Standing / UI  │
        │   subgraph    │         │ (MCP optional) │
        └───────────────┘         └────────────────┘

Optional track (not on critical path):
  apps/api  ──x402──►  Hedera testnet (Blocky402)  ──► paid /xenia/check
```

| Layer | Responsibility | Chain |
| --- | --- | --- |
| `XeniaRegistry` | Register agents, backings, premiums, dispute, slash | Ethereum Sepolia |
| Subgraph | Index agents / backings / slashes | The Graph → Sepolia |
| `apps/web` | Human product flows (RainbowKit) | Sepolia |
| `apps/demo` | One-click narrative Run | Sepolia (server-funded) |
| `apps/api` | Optional micropayment-gated standing | Hedera testnet |
| `apps/mcp` | Optional agent tooling | Subgraph |

> Hedera is **not** on Subgraph Studio. Protocol state lives on Sepolia; x402 (when used) settles on Hedera.

---

## Monorepo layout

```text
xenia/
├── apps/
│   ├── web/                 # Product app (Next.js)
│   ├── demo/                # On-chain demo theater (Next.js)
│   ├── api/                 # WIP x402 Fastify service
│   └── mcp/                 # WIP standing MCP server
├── packages/
│   ├── shared/              # ABI + standing helpers
│   ├── config/              # Root .env loader
│   ├── demo/                # Sepolia orchestrator (Run)
│   ├── ens/                 # ENSv2 scripts
│   └── subgraph/            # The Graph manifests + mappings
├── contracts/               # Foundry (XeniaRegistry)
├── docs/                    # Architecture & ops notes
├── .env.example
├── pnpm-workspace.yaml
└── README.md
```

Package manager: **pnpm** (`packageManager` in root `package.json`). Node **≥ 20**.

---

## Quick start

```bash
corepack enable && corepack prepare pnpm@10.13.1 --activate
cp .env.example .env
cp apps/web/.env.example apps/web/.env.local
# fill Sepolia RPC, funded PRIVATE_KEY / HOST_PRIVATE_KEY, WalletConnect id

pnpm install
pnpm test:contracts

pnpm dev:web                  # http://localhost:3000
pnpm dev:demo                 # http://localhost:3001
```

Optional WIP services:

```bash
pnpm dev:api                  # :4021 — x402 (not required for Run)
pnpm dev:mcp                  # stdio MCP
pnpm smoke:x402               # unpaid check → HTTP 402
```

### Demo Run requirements

- `XENIA_REGISTRY_ADDRESS` — current Sepolia deploy
- `HOST_PRIVATE_KEY` (or `PRIVATE_KEY`) — funded Sepolia wallet
- `DISPUTE_WINDOW_MS=10000` — must match on-chain `DISPUTE_WINDOW` (10s)
- Low `STAKE_WEI` / `DEMO_GAS_WEI` so faucet balances can finish a run (~0.005 ETH)

---

## Scripts

| Command | Purpose |
| --- | --- |
| `pnpm dev:web` | Product app (:3000) |
| `pnpm dev:demo` | Demo theater (:3001) |
| `pnpm demo` | CLI orchestrator |
| `pnpm test:contracts` | Foundry tests |
| `pnpm build:contracts` | `forge build` |
| `pnpm build:subgraph` | Codegen + build |
| `pnpm ens:*` | ENS helpers |
| `pnpm dev:api` / `smoke:x402` | WIP x402 |
| `pnpm dev:mcp` | WIP MCP |

---

## Deployed (Sepolia)

| Resource | Value |
| --- | --- |
| Registry | `0x8B71cd2dfDD7b8F774c84fF977EDF7839ceFDF28` |
| Dispute window | **10 seconds** |
| Deploy tx | `0xf8f5ae46435bfbff0fdd561e27ec00e269dc475af595b1b3d9cfeda66dede629` |
| Start block | `11695254` |
| ENS parent | `xenia.eth` |
| UserRegistry | `0xBb6Cdc52E71e25096Cb457237e3CcA220EC911a4` |
| Resolver | `0x8e3a29263B8d016f3D56daf98ABcAAbAf996C889` |

Subgraph Studio URL may lag until you re-publish against the address above. Demo standing falls back on-chain when the index is behind.

Previous registry (`0x71B801…e314`, 180s window) is superseded for demos.

---

## Hosting

| App | Platform | Notes |
| --- | --- | --- |
| `apps/web` | Vercel | Users pay their own gas |
| `apps/demo` UI | Vercel | Tour works without secrets |
| Demo **Run** | Railway / Fly / VPS | Needs Node + `HOST_PRIVATE_KEY`; not plain serverless |
| `apps/api` | Node host | Optional Hedera track |

---

## Security

- Never commit `.env` / `.env.local` / private keys
- Demo Run spends the **host** key — rate-limit if public
- Registry dispute window is **immutable** per deploy; change it by redeploying

---

## License

MIT — see [LICENSE](./LICENSE).
