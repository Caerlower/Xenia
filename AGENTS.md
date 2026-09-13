# Xenia agent notes

See root [README.md](./README.md) and [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md).

## Core vs WIP
- **Core:** `contracts`, `packages/subgraph`, `apps/web`, `apps/demo`, `packages/demo`, `apps/api` (x402 for demo Pay HBAR)
- **WIP:** `apps/mcp`; product UI wiring for paid standing

## Commands
- `pnpm dev:web` — :3000
- `pnpm dev:demo` — :3001
- `pnpm dev:api` — :4021 (required for demo Run / Pay HBAR)
- Package manager: **pnpm**

## Env
Root `.env` via `@xenia/config` `loadRootEnv()`. Never commit secrets.
`.xenia-hedera-payer.json` is an auto-provisioned x402 payer cache (gitignored); payer must ≠ `HEDERA_SERVICE_*` payTo.
