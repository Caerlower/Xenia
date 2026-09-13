import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { config as loadDotenv } from 'dotenv';
import { existsSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootEnv = resolve(__dirname, '../../.env');
const localEnv = resolve(__dirname, '.env.local');

if (existsSync(rootEnv)) loadDotenv({ path: rootEnv });
if (existsSync(localEnv)) loadDotenv({ path: localEnv, override: true });

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: resolve(__dirname, '../..'),
  transpilePackages: ['@xenia/config', '@xenia/shared'],
  env: {
    NEXT_PUBLIC_XENIA_REGISTRY_ADDRESS:
      process.env.XENIA_REGISTRY_ADDRESS ||
      process.env.NEXT_PUBLIC_XENIA_REGISTRY_ADDRESS ||
      '0x8B71cd2dfDD7b8F774c84fF977EDF7839ceFDF28',
    NEXT_PUBLIC_SEPOLIA_RPC_URL:
      process.env.SEPOLIA_RPC_URL ||
      process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL ||
      'https://ethereum-sepolia-rpc.publicnode.com',
    NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID:
      process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '',
  },
};

export default nextConfig;
