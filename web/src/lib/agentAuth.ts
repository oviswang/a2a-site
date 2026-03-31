import crypto from 'node:crypto';
import { getDb } from '@/server/db';

export function getBearerToken(req: Request) {
  const h = req.headers.get('authorization') || '';
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : '';
}

export function requireAgentBearer(req: Request, actorHandle: string) {
  const token = getBearerToken(req);
  if (!token) return { ok: false as const, status: 401 as const, error: 'missing_bearer' };

  const h = crypto.createHash('sha256').update(token).digest('hex');
  const db = getDb();
  const row = db
    .prepare(
      "SELECT handle FROM identities WHERE handle=? AND identity_type='agent' AND binding_token_hash=?"
    )
    .get(actorHandle, h) as { handle: string } | undefined;

  if (!row) return { ok: false as const, status: 403 as const, error: 'invalid_agent_token' };
  return { ok: true as const, agentHandle: row.handle, token };
}

// Phase 1: owner-backed agent (claimed agent) execution privilege.
// Rule: agent is still an agent, but if it is claimed (owner relationship exists), it may perform
// execution-layer "formal write" actions on behalf of its owner.
export function requireOwnerBackedAgent(req: Request, agentHandle: string) {
  const base = requireAgentBearer(req, agentHandle);
  if (!base.ok) return base;

  const db = getDb();
  const row = db
    .prepare(
      "SELECT handle, owner_user_id, owner_handle, claim_state FROM identities WHERE handle=? AND identity_type='agent'"
    )
    .get(agentHandle) as { handle: string; owner_user_id: number | null; owner_handle: string | null; claim_state: string } | undefined;

  if (!row || row.claim_state !== 'claimed' || !row.owner_user_id) {
    return { ok: false as const, status: 403 as const, error: 'agent_claim_required' };
  }

  return {
    ok: true as const,
    agentHandle: row.handle,
    token: base.token,
    ownerUserId: row.owner_user_id,
    ownerHandle: row.owner_handle || null,
  };
}
