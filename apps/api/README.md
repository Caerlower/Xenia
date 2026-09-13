# @xenia/api — Hedera x402 standing gate

`POST /xenia/check` returns **HTTP 402** until the caller settles ~0.001 HBAR on
**Hedera testnet** via Blocky402, then returns standing (subgraph / on-chain).

## Run

```bash
# root .env
HEDERA_SERVICE_ACCOUNT_ID=0.0.xxxxx
HEDERA_SERVICE_PRIVATE_KEY=0x...
X402_FACILITATOR_URL=https://api.testnet.blocky402.com

pnpm dev:api          # :4021
pnpm smoke:x402       # unpaid check must return HTTP 402
```

The live demo Run (`pnpm dev:demo`) calls this service after the Sepolia slash
path — keep `dev:api` running while recording the bounty video.
