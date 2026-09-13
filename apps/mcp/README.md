# @xenia/mcp — WIP

Stdio MCP tool `check_agent_standing` (reads The Graph subgraph).

**Status:** in progress / not end-to-end tested in the product flow.  
Demo Run and web standing UIs query the subgraph directly (or on-chain fallback); they do not require this process.

```bash
pnpm dev:mcp
```

Requires `SUBGRAPH_URL` in the root `.env`.
