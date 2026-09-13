import { formatEther, type Address, isAddress } from 'viem';
import { XENIA_REGISTRY_ABI } from '@xenia/shared';

export const XENIA_ABI = XENIA_REGISTRY_ABI;

export const REGISTRY_ADDRESS = (process.env
  .NEXT_PUBLIC_XENIA_REGISTRY_ADDRESS ||
  '0x8B71cd2dfDD7b8F774c84fF977EDF7839ceFDF28') as Address;

export function asAddress(value: string): Address | null {
  return isAddress(value) ? (value as Address) : null;
}

export function shortAddr(addr?: string | null, chars = 4) {
  if (!addr) return '—';
  if (addr.length < 10) return addr;
  return `${addr.slice(0, 2 + chars)}…${addr.slice(-chars)}`;
}

export function formatEth(wei: string | bigint, digits = 4) {
  try {
    const n = typeof wei === 'bigint' ? wei : BigInt(wei);
    const eth = Number(formatEther(n));
    if (!Number.isFinite(eth)) return '—';
    return `${eth.toFixed(digits)} ETH`;
  } catch {
    return '—';
  }
}

export function formatTs(ts: string | number) {
  const n = typeof ts === 'string' ? Number(ts) : ts;
  if (!n) return '—';
  const d = new Date(n * 1000);
  return d.toISOString().slice(0, 10);
}
