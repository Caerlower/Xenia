import { HTTPFacilitatorClient, x402ResourceServer } from '@x402/core/server';
import { ExactHederaScheme } from '@x402/hedera/exact/server';

/**
 * Adapt Hedera x402 PoC pattern: resource server + ExactHederaScheme
 * settled via Blocky402 (or x402.org) facilitator.
 */
export function createResourceServer() {
  const facilitatorUrl =
    process.env.X402_FACILITATOR_URL ??
    process.env.X402_TESTNET_FACILITATOR_URL ??
    'https://api.blocky402.com';

  const facilitatorClient = new HTTPFacilitatorClient({ url: facilitatorUrl });

  return new x402ResourceServer(facilitatorClient).register(
    'hedera:*',
    new ExactHederaScheme({}),
  );
}

export const CHECK_PRICE = { asset: '0.0.0', amount: '100000' }; // 0.001 HBAR
export const NETWORK = 'hedera:testnet' as const;
