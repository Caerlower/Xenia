# Architecture

## Protocol lifecycle

1. **Register** — wallet calls `registerAgent(ensNode)` once.
2. **Back** — host `createBacking{value: stake}(agent, stake, premiumRate)`.
3. **Trust fee** — agent `payPremium{value: premiumRate}(backingId)` → ETH to host.
4. **Default** — `reportDefault` opens dispute; status → Disputed.
5. **Window** — `DISPUTE_WINDOW` seconds (demo deploy: **10**).
6. **Resolve** — `resolveDispute(backingId, defaulted)` → slash to counterparty or return stake.
7. **Standing** — subgraph + helpers score agents for UIs / MCP / x402.

## Apps

### `apps/web`
Next.js product surface. Wagmi/RainbowKit → Sepolia registry. Standing/directory via subgraph API routes.

### `apps/demo`
Demo-only theater. `POST /api/run-demo` spawns `packages/demo` orchestrator (fresh wallets each Run, funded from host key). No product wallet flows.

### `apps/api` (WIP)
Fastify + `@x402/hedera`. `POST /xenia/check` returns HTTP 402 until Blocky402 settlement. Not called by web/demo Run today.

### `apps/mcp` (WIP)
Stdio MCP `check_agent_standing` over subgraph GraphQL.

## Packages

| Package | Role |
| --- | --- |
| `@xenia/shared` | ABI + standing math |
| `@xenia/config` | `loadRootEnv()` |
| `@xenia/demo` | Orchestrator + CLI agents |
| `@xenia/ens` | Subname / EAC scripts |
| `@xenia/subgraph` | Graph manifests |

## Contracts

Foundry project at repo root `contracts/` for ergonomic `forge` UX. Deploy:

```bash
cd contracts
DISPUTE_WINDOW=10 forge script script/Deploy.s.sol:Deploy \
  --rpc-url $SEPOLIA_RPC_URL --broadcast --private-key $PRIVATE_KEY
```

Then update `XENIA_REGISTRY_ADDRESS`, `packages/subgraph/subgraph.yaml`, and republish the subgraph.
