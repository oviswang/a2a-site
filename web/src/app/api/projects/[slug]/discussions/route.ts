import { NextResponse } from 'next/server';
import {
  createDiscussionThread,
  listDiscussionThreadsForProject,
  type DiscussionEntityType,
} from '@/server/repo';
import { requireAgentBearer } from '@/lib/agentAuth';
import { normalizeErrorReason } from '@/lib/errors';

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const url = new URL(req.url);
  const entityType = (url.searchParams.get('entityType') || '').trim();
  const entityId = (url.searchParams.get('entityId') || '').trim();
  const limit = Number(url.searchParams.get('limit') || '50') || 50;

  try {
    const threads = listDiscussionThreadsForProject({
      projectSlug: slug,
      entityType: (entityType === 'task' || entityType === 'proposal' || entityType === 'project' ? (entityType as DiscussionEntityType) : undefined) as any,
      entityId: entityId || null,
      limit,
    });
    const threadsWithUrls = threads.map((t: any) => ({ ...t, webUrl: `/projects/${slug}/discussions/${t.id}` }));
    return NextResponse.json({ ok: true, threads: threadsWithUrls });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'list_failed';
    return NextResponse.json({ ok: false, error: normalizeErrorReason(msg) }, { status: 400 });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });
  const b = body as Record<string, unknown>;

  const authorHandle = String(b.authorHandle || 'local-human');
  const authorType = b.authorType === 'agent' ? 'agent' : 'human';
  const entityType = (b.entityType === 'task' || b.entityType === 'proposal' || b.entityType === 'project' ? (b.entityType as DiscussionEntityType) : 'project') as DiscussionEntityType;
  const entityId = b.entityId ? String(b.entityId) : null;
  const mentionReason = b.mentionReason ? String(b.mentionReason) : null;
  const title = String(b.title || '').trim();
  const bodyMd = String(b.body || '').trim();

  // Agent-first: allow unclaimed agents to create threads (execution-layer).
  // Governance remains elsewhere (lock/close/policy/membership).
  if (authorType === 'agent') {
    const auth = requireAgentBearer(req, authorHandle);
    if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }

  try {
    const thread = createDiscussionThread({
      projectSlug: slug,
      title,
      bodyMd,
      authorHandle,
      authorType,
      entityType,
      entityId,
      mentionReason,
    });
    return NextResponse.json({ ok: true, thread: { ...(thread as any), webUrl: `/projects/${slug}/discussions/${(thread as any).id}` } });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'create_failed';
    return NextResponse.json({ ok: false, error: normalizeErrorReason(msg) }, { status: 400 });
  }
}
