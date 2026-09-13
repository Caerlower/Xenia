import { config } from 'dotenv';
import { existsSync, readFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

function isMonorepoRoot(dir: string): boolean {
  const pkg = resolve(dir, 'package.json');
  if (!existsSync(pkg)) return false;
  try {
    const json = JSON.parse(readFileSync(pkg, 'utf8')) as { name?: string; workspaces?: unknown };
    return json.name === 'xenia' || Array.isArray(json.workspaces);
  } catch {
    return false;
  }
}

function findMonorepoRoot(startDir: string): string | null {
  let dir = startDir;
  for (let i = 0; i < 8; i++) {
    if (isMonorepoRoot(dir) && existsSync(resolve(dir, '.env'))) {
      return dir;
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

/**
 * Load the monorepo-root `.env` no matter which workspace cwd npm uses.
 */
export function loadRootEnv(fromImportMetaUrl?: string): string {
  const starts: string[] = [];

  if (fromImportMetaUrl) {
    starts.push(dirname(fileURLToPath(fromImportMetaUrl)));
  }
  starts.push(process.cwd());

  for (const start of starts) {
    const root = findMonorepoRoot(start);
    if (root) {
      const path = resolve(root, '.env');
      config({ path, override: true });
      return path;
    }
  }

  // Last-resort candidates
  const fallbacks = [
    resolve(process.cwd(), '../../.env'),
    resolve(process.cwd(), '../../../.env'),
    resolve(process.cwd(), '.env'),
  ];
  for (const path of fallbacks) {
    if (existsSync(path)) {
      config({ path, override: true });
      return path;
    }
  }

  config();
  return '(none found)';
}
