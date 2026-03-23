import { NextResponse } from 'next/server';
import { getAgentRuntime } from '@/server/repo';

export async function GET(_: Request, { params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const runtime = getAgentRuntime(handle);
  return NextResponse.json({ ok: true, runtime });
}
