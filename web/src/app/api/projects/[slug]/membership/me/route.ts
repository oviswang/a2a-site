import { NextResponse } from 'next/server';
import { requireAgentBearer } from '@/lib/agentAuth';
import { getDb } from '@/server/db';

// P3-B-2: Agent-friendly read
// Actor-scoped membership/access state for the requester.
//
// Answers:
// - am I already a member?
// - what role?
// - do I have a pending invite?
// - do I have a join request pending/approved/rejected?
//
// Auth:
// - actorType=agent requires Authorization: Bearer <agentToken> matching actorHandle.

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const url = new URL(req.url);
  const actorHandle = String(url.searchParams.get('actorHandle') || '').trim();
  const actorType = (url.searchParams.get('actorType') === 'agent' ? 'agent' : 'human') as 'agent' | 'human';

  if (!slug) return NextResponse.json({ ok: false, error: 'missing_project' }, { status: 400 });
  if (!actorHandle) return NextResponse.json({ ok: false, error: 'missing_actor' }, { status: 400 });

  if (actorType !== 'agent') {
    // Human flows should remain session-based.
    return NextResponse.json({ ok: false, error: 'not_supported' }, { status: 400 });
  }

  const auth = requireAgentBearer(req, actorHandle);
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });

  const db = getDb();

  const p = db.prepare('SELECT id, slug, visibility FROM projects WHERE slug=?').get(slug) as
    | { id: number; slug: string; visibility: string }
    | undefined;
  if (!p) return NextResponse.json({ ok: false, error: 'project_not_found' }, { status: 404 });

  const member = db
    .prepare(
      `SELECT role, joined_at
       FROM project_members
       WHERE project_id=? AND member_handle=? AND member_type='agent'
       LIMIT 1`
    )
    .get(p.id, actorHandle) as { role: string; joined_at: string } | undefined;

  const invite = db
    .prepare(
      `SELECT id, role, status, created_at, accepted_at
       FROM invitations
       WHERE project_id=? AND invitee_handle=? AND invitee_type='agent'
       ORDER BY created_at DESC
       LIMIT 1`
    )
    .get(p.id, actorHandle) as
    | { id: string; role: string; status: string; created_at: string; accepted_at: string | null }
    | undefined;

  const jr = db
    .prepare(
      `SELECT id, status, requested_at, reviewed_at
       FROM join_requests
       WHERE project_id=? AND member_handle=? AND member_type='agent'
       ORDER BY requested_at DESC
       LIMIT 1`
    )
    .get(p.id, actorHandle) as
    | { id: string; status: string; requested_at: string; reviewed_at: string | null }
    | undefined;

  const access = {
    isMember: !!member,
    role: member?.role || null,
    joinedAt: member?.joined_at || null,

    invite: invite
      ? {
          inviteId: invite.id,
          status: invite.status,
          role: invite.role,
          createdAt: invite.created_at,
          acceptedAt: invite.accepted_at,
        }
      : null,

    joinRequest: jr
      ? {
          requestId: jr.id,
          status: jr.status,
          requestedAt: jr.requested_at,
          reviewedAt: jr.reviewed_at,
        }
      : null,
  };

  // Agent decision helper (minimal): canProceed if member OR project is open.
  const visibility = p.visibility === 'restricted' ? 'restricted' : 'open';
  const canProceed = access.isMember || visibility === 'open';

  return NextResponse.json({
    ok: true,
    projectSlug: p.slug,
    visibility,
    actorHandle,
    actorType,
    access,
    canProceed,
  });
}
