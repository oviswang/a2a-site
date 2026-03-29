import { NextResponse } from 'next/server';
import { closeDiscussionThread } from '@/server/repo';
import { requireAgentBearer } from '@/lib/agentAuth';

export async function POST(req: Request, { params }: { params: Promise<{ slug: string; threadId: string }> }) {
  const { slug, threadId } = await params;
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });
  const b = body as Record<string, unknown>;

  const actorHandle = String(b.actorHandle || 'local-human');
  const actorType = b.actorType === 'agent' ? 'agent' : 'human';

  // v1: agent close is not supported; still require bearer if agent attempts.
  if (actorType === 'agent') {
    const auth = requireAgentBearer(req, actorHandle);
    if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }

  try {
    const res = closeDiscussionThread({ projectSlug: slug, threadId, actorHandle, actorType });
    return NextResponse.json(res);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'close_failed';
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}

