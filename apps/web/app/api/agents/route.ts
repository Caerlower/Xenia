import { NextResponse } from 'next/server';
import { fetchAgents } from '@/lib/agents';

export async function GET() {
  try {
    const agents = await fetchAgents(100);
    return NextResponse.json({ agents });
  } catch (error) {
    return NextResponse.json(
      { agents: [], error: error instanceof Error ? error.message : 'failed' },
      { status: 200 },
    );
  }
}
