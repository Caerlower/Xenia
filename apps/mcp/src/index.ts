#!/usr/bin/env node
/**
 * Xenia MCP server — usable from Claude Desktop / Cursor.
 * Tool: check_agent_standing(agent_id)
 */
import { loadRootEnv } from '@xenia/config';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { computeStandingScore, type StandingResult } from '@xenia/shared';

loadRootEnv(import.meta.url);

const SUBGRAPH_URL = process.env.SUBGRAPH_URL ?? '';

async function fetchAgentStanding(agentId: string): Promise<StandingResult> {
  if (!SUBGRAPH_URL) {
    throw new Error('SUBGRAPH_URL env var required (Subgraph Studio query endpoint)');
  }

  const id = agentId.toLowerCase();
  const query = `
    query ($id: ID!) {
      agent(id: $id) {
        id
        ensName
        standingScore
        inGoodStanding
        premiumsPaidCount
        defaultsCount
        slashesCount
        backings {
          id
          host
          stakeAmount
          premiumRate
          status
          premiums {
            amount
            timestamp
          }
          defaults {
            counterparty
            timestamp
          }
          slashes {
            counterparty
            slashAmount
            timestamp
          }
        }
      }
    }
  `;

  const res = await fetch(SUBGRAPH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables: { id } }),
  });

  if (!res.ok) {
    throw new Error(`Subgraph HTTP ${res.status}: ${await res.text()}`);
  }

  const json = (await res.json()) as {
    data?: {
      agent: {
        id: string;
        ensName: string | null;
        standingScore: number;
        inGoodStanding: boolean;
        premiumsPaidCount: string;
        defaultsCount: string;
        slashesCount: string;
        backings: Array<{
          id: string;
          host: string;
          stakeAmount: string;
          premiumRate: string;
          status: string;
          premiums: Array<{ amount: string; timestamp: string }>;
          defaults: Array<{ counterparty: string; timestamp: string }>;
          slashes: Array<{ counterparty: string; slashAmount: string; timestamp: string }>;
        }>;
      } | null;
    };
    errors?: Array<{ message: string }>;
  };

  if (json.errors?.length) {
    throw new Error(json.errors.map((e) => e.message).join('; '));
  }

  const agent = json.data?.agent;
  if (!agent) {
    return {
      agentId: id,
      ensName: null,
      hosts: [],
      premiumPaymentHistory: [],
      defaultHistory: [],
      slashHistory: [],
      standingScore: 0,
      inGoodStanding: false,
    };
  }

  const premiumPaymentHistory = agent.backings.flatMap((b) =>
    b.premiums.map((p) => ({
      backingId: b.id,
      amount: p.amount,
      timestamp: p.timestamp,
    })),
  );

  const defaultHistory = agent.backings.flatMap((b) =>
    b.defaults.map((d) => ({
      backingId: b.id,
      counterparty: d.counterparty,
      timestamp: d.timestamp,
    })),
  );

  const slashHistory = agent.backings.flatMap((b) =>
    b.slashes.map((s) => ({
      backingId: b.id,
      counterparty: s.counterparty,
      amount: s.slashAmount,
      timestamp: s.timestamp,
    })),
  );

  // Prefer subgraph-computed score; recompute as sanity check
  const standingScore =
    agent.standingScore ??
    computeStandingScore({
      premiumsPaidOnTime: Number(agent.premiumsPaidCount),
      defaults: Number(agent.defaultsCount),
      slashes: Number(agent.slashesCount),
    });

  return {
    agentId: agent.id,
    ensName: agent.ensName,
    hosts: agent.backings.map((b) => ({
      host: b.host,
      backingId: b.id,
      stakeAmount: b.stakeAmount,
      premiumRate: b.premiumRate,
      status: b.status,
    })),
    premiumPaymentHistory,
    defaultHistory,
    slashHistory,
    standingScore,
    inGoodStanding: agent.inGoodStanding,
  };
}

const server = new Server(
  { name: 'xenia-mcp', version: '0.1.0' },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'check_agent_standing',
      description:
        'Query the live Xenia subgraph for an AI agent\'s trust standing: current host(s), stake, premium history, defaults, slashes, and computed standing score (0–100). Use before transacting with an agent.',
      inputSchema: {
        type: 'object',
        properties: {
          agent_id: {
            type: 'string',
            description: 'Agent wallet address (0x…) or subgraph agent id',
          },
        },
        required: ['agent_id'],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name !== 'check_agent_standing') {
    throw new Error(`Unknown tool: ${request.params.name}`);
  }

  const agentId = (request.params.arguments as { agent_id?: string })?.agent_id;
  if (!agentId) {
    throw new Error('agent_id is required');
  }

  const result = await fetchAgentStanding(agentId);
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(result, null, 2),
      },
    ],
  };
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('xenia-mcp listening on stdio (check_agent_standing)');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
