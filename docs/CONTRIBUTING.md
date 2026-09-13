# Contributing

## Setup

1. Node 20+, pnpm 10 (`corepack enable`)
2. `cp .env.example .env` and `cp apps/web/.env.example apps/web/.env.local`
3. `pnpm install`
4. Foundry for contracts: [getfoundry.sh](https://getfoundry.sh)

## Workflow

- Prefer small PRs against `main`
- Do not commit secrets (`.env`, keys, `.cursor/` caches)
- Contract changes: `pnpm test:contracts` before PR
- Demo Run changes: keep stake/gas pads faucet-friendly

## Packages

This is a pnpm workspace. Use `pnpm --filter <name> <script>` for package-local commands.

## Status awareness

`apps/api` and `apps/mcp` are WIP. Prefer extending `apps/web` / `apps/demo` / `contracts` unless you are intentionally working the Hedera/MCP track.
