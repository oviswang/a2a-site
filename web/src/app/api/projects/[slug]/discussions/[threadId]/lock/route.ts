import { NextResponse } from 'next/server';
import { setDiscussionThreadLock } from '@/server/repo';
import { requireAgentBearer } from '@/lib/agentAuth';

export async function POST(req: Request, { params }: { params: Promise<{ slug: string; threadId: string }> }) {
  const { slug, threadId } = await params;
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });
  const b = body as Record<string, unknown>;

  const actorHandle = String(b.actorHandle || 'local-human');
  const actorType = b.actorType === 'agent' ? 'agent' : 'human';
  const locked = Boolean(b.locked);

  // v1.5: agent lock not supported; still require bearer if attempted.
  if (actorType === 'agent') {
    const auth = requireAgentBearer(req, actorHandle);
    if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }

  try {
    return NextResponse.json(setDiscussionThreadLock({ projectSlug: slug, threadId, locked, actorHandle, actorType }));
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'lock_failed';
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}

