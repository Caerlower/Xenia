/**
 * ENSv2 Sepolia helpers for Xenia agent subnames + Permissioned Resolver EAC.
 *
 * Qualification demo: grant ROLE_SET_TEXT for backing keys ONLY to the host.
 * Agent (and any other address) must fail to edit; host must succeed.
 */
import { loadRootEnv } from '@xenia/config';
import {
  createPublicClient,
  createWalletClient,
  http,
  namehash,
  type Address,
  type Hex,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { sepolia } from 'viem/chains';
import { packetToBytes } from 'viem/ens';

loadRootEnv(import.meta.url);

export const PARENT_NAME = process.env.ENS_PARENT_NAME ?? 'xenia.eth';

/** Text keys written under each agent subname (host-only via EAC). */
export const BACKING_TEXT_KEYS = [
  'xenia.host',
  'xenia.stake',
  'xenia.premiumStatus',
  'xenia.backingId',
] as const;

/**
 * ROLE_SET_TEXT = 1 << 4 per ENSv2 Permissioned Resolver docs.
 * Record-level grants use authorizeTextRoles(toName, key, account, grant).
 */
export const ROLE_SET_TEXT = 1n << 4n;

export const permissionedResolverAbi = [
  {
    type: 'function',
    name: 'setText',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'node', type: 'bytes32' },
      { name: 'key', type: 'string' },
      { name: 'value', type: 'string' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'text',
    stateMutability: 'view',
    inputs: [
      { name: 'node', type: 'bytes32' },
      { name: 'key', type: 'string' },
    ],
    outputs: [{ name: '', type: 'string' }],
  },
  {
    type: 'function',
    name: 'authorizeTextRoles',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'toName', type: 'bytes' },
      { name: 'key', type: 'string' },
      { name: 'account', type: 'address' },
      { name: 'grant', type: 'bool' },
    ],
    outputs: [],
  },
] as const;

/** ENSv2 PermissionedRegistry / UserRegistry.register */
export const permissionedRegistryAbi = [
  {
    type: 'function',
    name: 'register',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'label', type: 'string' },
      { name: 'owner', type: 'address' },
      { name: 'registry', type: 'address' },
      { name: 'resolver', type: 'address' },
      { name: 'roleBitmap', type: 'uint256' },
      { name: 'expiry', type: 'uint64' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'getResolver',
    stateMutability: 'view',
    inputs: [{ name: 'label', type: 'string' }],
    outputs: [{ name: '', type: 'address' }],
  },
] as const;

/** Roles granted to each agent on its subname (generous demo bitmap). */
export const SUBNAME_OWNER_ROLE_BITMAP =
  0x1111111111111111111111111111111111111111111111111111111111111111n;

export function dnsEncodeName(name: string): Hex {
  return `0x${Buffer.from(packetToBytes(name)).toString('hex')}` as Hex;
}

export function getClients() {
  const rpc = process.env.SEPOLIA_RPC_URL ?? 'https://ethereum-sepolia-rpc.publicnode.com';
  const raw = process.env.ENS_OWNER_PRIVATE_KEY;
  if (!raw) throw new Error('ENS_OWNER_PRIVATE_KEY required');
  const pk = (raw.startsWith('0x') ? raw : `0x${raw}`) as Hex;

  const account = privateKeyToAccount(pk);
  const publicClient = createPublicClient({ chain: sepolia, transport: http(rpc) });
  const walletClient = createWalletClient({
    account,
    chain: sepolia,
    transport: http(rpc),
  });

  return { account, publicClient, walletClient };
}

export function agentSubname(label: string): string {
  return `${label}.${PARENT_NAME}`;
}

export function agentNode(label: string): Hex {
  return namehash(agentSubname(label));
}

export function requireEnvAddress(name: string): Address {
  const v = process.env[name];
  if (!v) throw new Error(`${name} required (ENSv2 Sepolia deployment address)`);
  return v as Address;
}
