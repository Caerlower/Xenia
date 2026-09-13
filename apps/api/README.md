# @xenia/api — WIP

Hedera **x402** micropayment gate (`POST /xenia/check`) plus helper Sepolia routes.

**Status:** in progress / not end-to-end tested with the product UI.  
`apps/web` and `apps/demo` Run **do not** call this service.

```bash
pnpm dev:api          # :4021
pnpm smoke:x402       # unpaid check must return HTTP 402
```

Needs Hedera service account env vars — see root `.env.example`.
