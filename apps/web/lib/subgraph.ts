import { config } from 'dotenv';
import { existsSync } from 'fs';
import { resolve } from 'path';

let loaded = false;

function ensureEnv() {
  if (loaded) return;
  for (const path of [
    resolve(process.cwd(), '.env.local'),
    resolve(process.cwd(), '../../.env'),
  ]) {
    if (existsSync(path)) config({ path, override: true });
  }
  loaded = true;
}

export function getSubgraphUrl() {
  ensureEnv();
  return process.env.SUBGRAPH_URL?.trim() || '';
}

export async function subgraphQuery<T>(
  query: string,
  variables?: Record<string, unknown>,
): Promise<{ data: T | null; errors: unknown }> {
  const url = getSubgraphUrl();
  if (!url) {
    return { data: null, errors: [{ message: 'SUBGRAPH_URL not configured' }] };
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
    cache: 'no-store',
  });

  const json = await res.json();
  return { data: json.data ?? null, errors: json.errors ?? null };
}
