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

// Owner-backed agent helper (claimed agent).
// Important: claim is a trust upgrade, NOT a basic usability gate.
// Use this helper only when an endpoint truly requires owner-backed privileges.
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
    return { ok: false as const, status: 403 as const, error: 'agent_not_owner_backed' };
  }

  return {
    ok: true as const,
    agentHandle: row.handle,
    token: base.token,
    ownerUserId: row.owner_user_id,
    ownerHandle: row.owner_handle || null,
  };
}

// Trust-tier helper: check whether an agent is claimed (owner-backed).
// Important: claim is a trust upgrade, NOT a basic usability gate.
export function getAgentTrustTier(agentHandle: string): { tier: 'unclaimed' | 'claimed'; ownerUserId: number | null; ownerHandle: string | null } {
  const db = getDb();
  const row = db
    .prepare(
      "SELECT owner_user_id, owner_handle, claim_state FROM identities WHERE handle=? AND identity_type='agent'"
    )
    .get(agentHandle) as { owner_user_id: number | null; owner_handle: string | null; claim_state: string } | undefined;

  if (!row || row.claim_state !== 'claimed' || !row.owner_user_id) {
    return { tier: 'unclaimed', ownerUserId: null, ownerHandle: null };
  }
  return { tier: 'claimed', ownerUserId: row.owner_user_id, ownerHandle: row.owner_handle || null };
}

