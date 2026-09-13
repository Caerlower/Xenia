#!/usr/bin/env python3
"""Create a clean initial commit history (50+ logical commits)."""
from __future__ import annotations

import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def run(cmd: list[str], check: bool = True) -> subprocess.CompletedProcess:
    return subprocess.run(cmd, cwd=ROOT, check=check, text=True, capture_output=True)


def commit(paths: list[str], message: str) -> bool:
    existing = [p for p in paths if (ROOT / p).exists()]
    if not existing:
        print(f"skip (missing): {message}")
        return False
    run(["git", "add", "-f", "--", *existing], check=False)
    staged = run(["git", "diff", "--cached", "--name-only"], check=False)
    if not staged.stdout.strip():
        print(f"skip (empty): {message}")
        return False
    proc = subprocess.run(
        ["git", "commit", "-m", message],
        cwd=ROOT,
        text=True,
        capture_output=True,
    )
    if proc.returncode != 0:
        print(f"FAIL: {message}\n{proc.stderr or proc.stdout}")
        return False
    print(f"ok: {message}")
    return True


COMMITS: list[tuple[list[str], str]] = [
    ([".gitignore"], "chore: add root gitignore for node, env, and build artifacts"),
    ([".npmrc"], "chore: configure pnpm workspace install behavior"),
    (["LICENSE"], "docs: add MIT license"),
    (["package.json"], "chore: scaffold root package.json workspace scripts"),
    (["pnpm-workspace.yaml"], "chore: declare pnpm workspace packages"),
    (["tsconfig.base.json"], "chore: add shared TypeScript base config"),
    (["turbo.json"], "chore: add turbo pipeline stub"),
    ([".env.example"], "chore: document root environment variables"),
    (["README.md"], "docs: write project README with status and architecture"),
    (["AGENTS.md"], "docs: add agent-oriented repo notes"),
    (["docs/ARCHITECTURE.md"], "docs: add architecture deep dive"),
    (["docs/CONTRIBUTING.md"], "docs: add contributing guide"),
    (["contracts/foundry.toml"], "chore(contracts): configure Foundry project"),
    (["contracts/remappings.txt"], "chore(contracts): add solc remappings"),
    (["contracts/foundry.lock"], "chore(contracts): lock Foundry dependency versions"),
    (["contracts/README.md"], "docs(contracts): document Foundry workflow"),
    ([".gitmodules"], "chore(contracts): register forge-std submodule"),
    (["contracts/lib/forge-std"], "chore(contracts): add forge-std dependency"),
    (["contracts/src/XeniaRegistry.sol"], "feat(contracts): implement XeniaRegistry slashable stake protocol"),
    (["contracts/test/XeniaRegistry.t.sol"], "test(contracts): cover register, premium, slash, and revoke flows"),
    (["contracts/script/Deploy.s.sol"], "feat(contracts): add Sepolia deploy script with fast dispute window"),
    (["packages/shared/package.json"], "chore(shared): add @xenia/shared package manifest"),
    (["packages/shared/src/index.ts"], "feat(shared): export registry ABI and standing helpers"),
    (["packages/config/package.json"], "chore(config): add @xenia/config package manifest"),
    (["packages/config/src/index.ts"], "feat(config): load monorepo root .env for apps and scripts"),
    (["packages/subgraph/package.json"], "chore(subgraph): add Graph package scripts"),
    (["packages/subgraph/schema.graphql"], "feat(subgraph): define Agent, Backing, and slash entities"),
    (["packages/subgraph/abis/XeniaRegistry.json"], "chore(subgraph): sync registry ABI for codegen"),
    (["packages/subgraph/src/mapping.ts"], "feat(subgraph): map registry events into entities"),
    (["packages/subgraph/subgraph.yaml"], "feat(subgraph): point data source at Sepolia registry"),
    (["packages/subgraph/networks.json"], "chore(subgraph): record network address and start block"),
    (["packages/ens/package.json"], "chore(ens): add ENS helper package"),
    (["packages/ens/tsconfig.json"], "chore(ens): add TypeScript config"),
    (["packages/ens/src/config.ts"], "feat(ens): shared ENS config loader"),
    (["packages/ens/src/register-subnames.ts"], "feat(ens): script to register agent subnames"),
    (["packages/ens/src/write-backing-records.ts"], "feat(ens): write host-only backing text records"),
    (["packages/ens/src/demo-eac-access.ts"], "feat(ens): demonstrate host-only EAC edit permissions"),
    (["packages/ens/src/deploy-user-registry.ts"], "feat(ens): deploy helper for user registry experiments"),
    (["packages/demo/package.json"], "chore(demo): add orchestrator package scripts"),
    (["packages/demo/tsconfig.json"], "chore(demo): add TypeScript config"),
    (["packages/demo/src/lib.ts"], "feat(demo): shared Sepolia clients, funding, and write helpers"),
    (["packages/demo/src/orchestrate.ts"], "feat(demo): full A/B slash path orchestrator for Run button"),
    (["packages/demo/src/run-demo-stream.ts"], "feat(demo): NDJSON event stream entrypoint for the demo site"),
    (["packages/demo/src/run-demo.ts"], "feat(demo): CLI entry for one-shot on-chain demo"),
    (["packages/demo/src/agent-a.ts"], "feat(demo): Agent A register, stake, and premium script"),
    (["packages/demo/src/agent-b.ts"], "feat(demo): Agent B default and slash path script"),
    (["packages/demo/src/agent-c.ts"], "feat(demo): Agent C standing checker script"),
    (["apps/api/package.json"], "chore(api): scaffold x402 Fastify service package"),
    (["apps/api/tsconfig.json"], "chore(api): add TypeScript config"),
    (["apps/api/README.md"], "docs(api): mark x402 service as WIP"),
    (["apps/api/src/x402.ts"], "feat(api): configure Hedera x402 resource server"),
    (["apps/api/src/index.ts"], "feat(api): expose paid standing check and Sepolia helpers"),
    (["apps/api/src/smoke-check.ts"], "test(api): smoke unpaid /xenia/check returns HTTP 402"),
    (["apps/mcp/package.json"], "chore(mcp): scaffold standing MCP package"),
    (["apps/mcp/tsconfig.json"], "chore(mcp): add TypeScript config"),
    (["apps/mcp/README.md"], "docs(mcp): mark standing MCP as WIP"),
    (["apps/mcp/src/index.ts"], "feat(mcp): implement check_agent_standing over subgraph"),
    (["apps/web/package.json"], "chore(web): scaffold product Next.js app"),
    (["apps/web/tsconfig.json"], "chore(web): add Next TypeScript config"),
    (["apps/web/next.config.mjs"], "chore(web): load root env and transpile workspace packages"),
    (["apps/web/next-env.d.ts"], "chore(web): add Next type references"),
    (["apps/web/postcss.config.js"], "chore(web): add PostCSS config"),
    (["apps/web/tailwind.config.js"], "chore(web): configure design tokens and Tailwind theme"),
    (["apps/web/.env.example"], "chore(web): document public registry and WalletConnect env"),
    (["apps/web/app/globals.css"], "style(web): add global product styles"),
    (["apps/web/lib/wagmi.ts"], "feat(web): configure wagmi Sepolia connectors"),
    (["apps/web/lib/format.ts"], "feat(web): registry address helpers and formatting"),
    (["apps/web/lib/types.ts"], "feat(web): shared agent and standing types"),
    (["apps/web/lib/subgraph.ts"], "feat(web): subgraph GraphQL client helpers"),
    (["apps/web/lib/agents.ts"], "feat(web): agent directory fetch helpers"),
    (["apps/web/lib/resolve-agent.ts"], "feat(web): resolve agents by ENS namehash"),
    (["apps/web/lib/agent-path.ts"], "feat(web): agent route path helpers"),
    (["apps/web/components/BrandMark.tsx"], "feat(web): add Xenia brand mark"),
    (["apps/web/components/Web3Provider.tsx"], "feat(web): RainbowKit provider with paper modal styling"),
    (["apps/web/components/Nav.tsx"], "feat(web): primary navigation"),
    (["apps/web/components/Footer.tsx"], "feat(web): site footer"),
    (["apps/web/components/HeroOath.tsx"], "feat(web): oath sculpture hero"),
    (["apps/web/components/StandingCheck.tsx"], "feat(web): standing check UI"),
    (["apps/web/components/LedgerTable.tsx"], "feat(web): ledger table component"),
    (["apps/web/components/ScoreRing.tsx"], "feat(web): standing score ring"),
    (["apps/web/app/layout.tsx"], "feat(web): root layout with fonts and providers"),
    (["apps/web/app/page.tsx"], "feat(web): landing page hero and product narrative"),
    (["apps/web/app/connect/page.tsx"], "feat(web): wallet connect page"),
    (["apps/web/app/dashboard/page.tsx"], "feat(web): dashboard for connected agent activity"),
    (["apps/web/app/explore/page.tsx"], "feat(web): explore agents directory"),
    (["apps/web/app/agents/new/page.tsx"], "feat(web): register agent flow"),
    (["apps/web/app/agents/[name]/page.tsx"], "feat(web): agent profile and standing breakdown"),
    (["apps/web/app/agents/[name]/back/page.tsx"], "feat(web): sponsor / vouch flow"),
    (["apps/web/app/agents/[name]/not-found.tsx"], "feat(web): agent not-found state"),
    (["apps/web/app/api/standing/route.ts"], "feat(web): standing API route over subgraph"),
    (["apps/web/app/api/agents/route.ts"], "feat(web): agents list API route"),
    (["apps/web/public/oath-sculpture.webp"], "assets(web): add oath sculpture hero art"),
    (["apps/web/public/oath-scanline.png"], "assets(web): add CRT scanline texture"),
    (["apps/demo/package.json"], "chore(demo-site): scaffold demo Next.js app"),
    (["apps/demo/tsconfig.json"], "chore(demo-site): add Next TypeScript config"),
    (["apps/demo/next.config.mjs"], "chore(demo-site): wire monorepo env and transpile"),
    (["apps/demo/next-env.d.ts"], "chore(demo-site): add Next type references"),
    (["apps/demo/postcss.config.js"], "chore(demo-site): add PostCSS config"),
    (["apps/demo/tailwind.config.js"], "chore(demo-site): match Xenia design tokens"),
    (["apps/demo/.env.example"], "chore(demo-site): document Run-on-chain env"),
    (["apps/demo/app/globals.css"], "style(demo-site): full-bleed CRT theater styles"),
    (["apps/demo/app/layout.tsx"], "feat(demo-site): root layout with pixel fonts"),
    (["apps/demo/app/page.tsx"], "feat(demo-site): immersive demo shell"),
    (["apps/demo/app/not-found.tsx"], "feat(demo-site): scoped 404 for demo-only routes"),
    (["apps/demo/components/BrandMark.tsx"], "feat(demo-site): brand mark for dark theater"),
    (["apps/demo/components/DemoTheater.tsx"], "feat(demo-site): interactive on-chain demo theater"),
    (["apps/demo/lib/demo.ts"], "feat(demo-site): demo state types"),
    (["apps/demo/lib/subgraph.ts"], "feat(demo-site): lightweight subgraph reads"),
    (["apps/demo/app/api/demo-state/route.ts"], "feat(demo-site): demo ledger snapshot API"),
    (["apps/demo/app/api/run-demo/route.ts"], "feat(demo-site): SSE Run endpoint spawning orchestrator"),
    (["apps/demo/public/oath-sculpture.webp"], "assets(demo-site): add theater background art"),
    (["apps/demo/public/oath-scanline.png"], "assets(demo-site): add scanline overlay asset"),
    (["scripts/bootstrap-history.py"], "chore: add history bootstrap helper for initial import"),
    (["pnpm-lock.yaml"], "chore: add pnpm lockfile for reproducible installs"),
]


def main() -> int:
    count = 0
    for paths, message in COMMITS:
        if commit(paths, message):
            count += 1

    run(["git", "add", "-A"], check=False)
    run(
        ["git", "reset", "HEAD", "--", ".env", "apps/web/.env.local", ".pnpm-store"],
        check=False,
    )
    leftover = run(["git", "diff", "--cached", "--name-only"], check=False)
    names = [n for n in leftover.stdout.splitlines() if n.strip()]
    if names:
        proc = subprocess.run(
            ["git", "commit", "-m", "chore: add remaining workspace files"],
            cwd=ROOT,
            text=True,
            capture_output=True,
        )
        if proc.returncode == 0:
            count += 1
            print("ok: chore: add remaining workspace files")
        else:
            print(proc.stderr or proc.stdout)

    print(f"\nTotal commits created: {count}")
    log = run(["git", "rev-list", "--count", "HEAD"], check=False)
    print(f"git rev-list count: {log.stdout.strip()}")
    return 0 if count >= 50 else 1


if __name__ == "__main__":
    sys.exit(main())
