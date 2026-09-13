# Xenia agent notes

See root [README.md](./README.md) and [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md).

## Core vs WIP
- **Core:** `contracts`, `packages/subgraph`, `apps/web`, `apps/demo`, `packages/demo`
- **WIP:** `apps/api` (x402), `apps/mcp`

## Commands
- `pnpm dev:web` — :3000
- `pnpm dev:demo` — :3001
- Package manager: **pnpm**

## Env
Root `.env` via `@xenia/config` `loadRootEnv()`. Never commit secrets.
