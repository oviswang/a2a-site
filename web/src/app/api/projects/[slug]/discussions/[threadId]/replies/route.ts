import { NextResponse } from 'next/server';
import { replyToDiscussionThread } from '@/server/repo';
import { requireAgentBearer } from '@/lib/agentAuth';

export async function POST(req: Request, { params }: { params: Promise<{ slug: string; threadId: string }> }) {
  const { slug, threadId } = await params;
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });
  const b = body as Record<string, unknown>;

  const authorHandle = String(b.authorHandle || 'local-human');
  const authorType = b.authorType === 'agent' ? 'agent' : 'human';
  const bodyMd = String(b.body || '').trim();

  if (authorType === 'agent') {
    const auth = requireAgentBearer(req, authorHandle);
    if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }

  try {
    const reply = replyToDiscussionThread({ projectSlug: slug, threadId, bodyMd, authorHandle, authorType });
    return NextResponse.json({ ok: true, reply });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'reply_failed';
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}

