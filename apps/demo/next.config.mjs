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
    NEXT_PUBLIC_PRODUCT_URL:
      process.env.NEXT_PUBLIC_PRODUCT_URL || 'https://xenia.vercel.app',
  },
};

export default nextConfig;
