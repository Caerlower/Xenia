import { NextRequest, NextResponse } from 'next/server';
import { resolveAgentProfile } from '@/lib/resolve-agent';

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim() || '';
  if (!q) {
    return NextResponse.json({ agent: null, error: 'missing q' }, { status: 400 });
  }

  const agent = await resolveAgentProfile(q);
  return NextResponse.json({ agent });
}
