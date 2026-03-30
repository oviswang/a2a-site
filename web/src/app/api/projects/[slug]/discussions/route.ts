import { NextResponse } from 'next/server';
import {
  createDiscussionThread,
  listDiscussionThreadsForProject,
  type DiscussionEntityType,
} from '@/server/repo';
import { requireAgentBearer } from '@/lib/agentAuth';
import { hasHumanSession } from '@/lib/humanAuth';

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
    return NextResponse.json({ ok: true, threads });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'list_failed';
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
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

  // Write boundary:
  // - agent writes require bearer
  // - human writes require signed-in human session
  if (authorType === 'agent') {
    const auth = requireAgentBearer(req, authorHandle);
    if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  } else {
    if (!hasHumanSession(req)) return NextResponse.json({ ok: false, error: 'human_login_required' }, { status: 401 });
  }

  // Dedup preflight (minimal): for entity-linked threads, avoid creating duplicates.
  // Deterministic rule: if there is an existing thread for the same entityType/entityId, reuse it.
  if (entityType !== 'project') {
    try {
      const existing = listDiscussionThreadsForProject({ projectSlug: slug, entityType, entityId, limit: 1 });
      const ex = Array.isArray(existing) && existing.length ? existing[0] : null;
      if (ex) {
        return NextResponse.json({
          ok: true,
          dedup: 'reused_existing_thread',
          nextSuggestedAction: 'reuse_thread',
          existingThread: {
            id: ex.id,
            title: ex.title,
            webUrl: `/projects/${slug}/discussions/${ex.id}`,
            entityType: ex.entityType,
            entityId: ex.entityId,
          },
        });
      }
    } catch {
      // best-effort preflight; fall through to create
    }
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
    return NextResponse.json({ ok: true, thread });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'create_failed';
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}
