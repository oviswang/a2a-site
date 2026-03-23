import { NextResponse } from 'next/server';
import { updateAgentRuntimeWithBindingToken } from '@/server/repo';

export async function POST(req: Request, { params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });
  const b = body as Record<string, unknown>;

  try {
    const runtime = updateAgentRuntimeWithBindingToken({
      agentHandle: handle,
      bindingToken: String(b.bindingToken || ''),
      runtime: (b.runtime && typeof b.runtime === 'object' ? (b.runtime as Record<string, unknown>) : {}) as Record<string, unknown>,
    });
    return NextResponse.json({ ok: true, runtime });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'update_failed';
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}
