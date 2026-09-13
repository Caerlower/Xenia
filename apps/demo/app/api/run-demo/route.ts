import { spawn } from 'child_process';
import { existsSync } from 'fs';
import { resolve } from 'path';
import { config as loadDotenv } from 'dotenv';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

type RunState = {
  running: boolean;
  startedAt: number | null;
  lastError: string | null;
};

const state: RunState = {
  running: false,
  startedAt: null,
  lastError: null,
};

function monorepoRoot() {
  const fromCwd = resolve(process.cwd(), '../..');
  if (existsSync(resolve(fromCwd, 'package.json'))) return fromCwd;
  return process.cwd();
}

function ensureEnv() {
  const root = monorepoRoot();
  const envPath = resolve(root, '.env');
  if (existsSync(envPath)) loadDotenv({ path: envPath, override: false });
  const local = resolve(process.cwd(), '.env.local');
  if (existsSync(local)) loadDotenv({ path: local, override: true });
}

export async function GET() {
  return Response.json({
    running: state.running,
    startedAt: state.startedAt,
    lastError: state.lastError,
  });
}

export async function POST() {
  ensureEnv();

  if (state.running) {
    return Response.json(
      { error: 'Demo already running', startedAt: state.startedAt },
      { status: 409 },
    );
  }

  const hasFunder =
    process.env.HOST_PRIVATE_KEY ||
    process.env.PRIVATE_KEY ||
    process.env.OPERATOR_PRIVATE_KEY;
  if (!process.env.XENIA_REGISTRY_ADDRESS) {
    return Response.json(
      { error: 'Missing env: XENIA_REGISTRY_ADDRESS' },
      { status: 500 },
    );
  }
  if (!hasFunder) {
    return Response.json(
      {
        error:
          'Missing env: HOST_PRIVATE_KEY (or PRIVATE_KEY / OPERATOR_PRIVATE_KEY) to fund new agents',
      },
      { status: 500 },
    );
  }

  state.running = true;
  state.startedAt = Date.now();
  state.lastError = null;

  const root = monorepoRoot();

  const stream = new ReadableStream({
    start(controller) {
      const enc = new TextEncoder();
      let stdoutBuf = '';
      let stderrBuf = '';
      let terminalSent = false;

      const send = (payload: Record<string, unknown>) => {
        if (payload.step === 'error' || payload.step === 'done') {
          terminalSent = true;
        }
        controller.enqueue(enc.encode(`data: ${JSON.stringify(payload)}\n\n`));
      };

      const child = spawn(
        'pnpm',
        ['--filter', '@xenia/demo', 'demo:stream'],
        {
          cwd: root,
          env: { ...process.env },
          stdio: ['ignore', 'pipe', 'pipe'],
        },
      );

      child.stdout.on('data', (chunk: Buffer) => {
        stdoutBuf += chunk.toString('utf8');
        const lines = stdoutBuf.split('\n');
        stdoutBuf = lines.pop() || '';
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('{')) continue;
          try {
            const parsed = JSON.parse(trimmed) as Record<string, unknown>;
            if (typeof parsed.step === 'string') send(parsed);
          } catch {
            /* ignore non-event noise */
          }
        }
      });

      child.stderr.on('data', (chunk: Buffer) => {
        stderrBuf += chunk.toString('utf8');
      });

      child.on('error', (err) => {
        state.lastError = err.message;
        state.running = false;
        if (!terminalSent) send({ step: 'error', message: err.message });
        controller.close();
      });

      child.on('close', (code) => {
        if (stdoutBuf.trim()) {
          try {
            const parsed = JSON.parse(stdoutBuf.trim()) as Record<string, unknown>;
            if (typeof parsed.step === 'string') send(parsed);
          } catch {
            /* ignore */
          }
        }
        if (code && code !== 0 && !terminalSent) {
          const strip = (s: string) =>
            s.replace(/\u001b\[[0-9;]*m/g, '').trim();
          const lines = stderrBuf
            .split('\n')
            .map(strip)
            .filter(Boolean)
            .filter((l) => !/^\[(FUND|A\d|B\d|C\d|ORCH)/.test(l));
          const useful =
            [...lines]
              .reverse()
              .find((l) =>
                /failed|revert|insufficient|Error:|error=|needs ~/i.test(l),
              ) || lines.at(-1);
          const message =
            useful || `Demo process exited with code ${code}`;
          state.lastError = message;
          send({ step: 'error', message });
        }
        state.running = false;
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
