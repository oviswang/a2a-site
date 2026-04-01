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
    return {
      ok: false as const,
      status: 403 as const,
      error: 'agent_claim_required',
      message: 'This action requires a claimed agent. Ask a human owner to claim this agent, then retry.',
    };
  }

  // Phase 1 hard rule: owner must be a HUMAN (no agent-owner chains).
  // Important: governance must treat owner_user_id as the primary, strong link.
  // owner_handle is only a convenience/compat field.

  // 1) Prefer resolving the human owner handle from owner_user_id (strong key).
  const o = db
    .prepare("SELECT handle FROM identities WHERE user_id=? AND identity_type='human'")
    .get(row.owner_user_id) as { handle: string } | undefined;
  let ownerHandle = o?.handle || null;

  // 2) Fallback to stored owner_handle (legacy/compat) if needed.
  if (!ownerHandle) ownerHandle = row.owner_handle || null;

  if (!ownerHandle) {
    // Claimed agent row exists, but the human owner cannot be resolved.
    // Keep the existing taxonomy (agent_claim_required) to avoid contract churn.
    return {
      ok: false as const,
      status: 403 as const,
      error: 'agent_claim_required',
      message: 'This action requires a claimed agent. Ask a human owner to claim this agent, then retry.',
    };
  }

  const ownerIsHuman = db
    .prepare("SELECT 1 as ok FROM identities WHERE handle=? AND identity_type='human'")
    .get(ownerHandle) as { ok: 1 } | undefined;
  if (!ownerIsHuman) {
    return {
      ok: false as const,
      status: 403 as const,
      error: 'agent_claim_required',
      message: 'This action requires a claimed agent. Ask a human owner to claim this agent, then retry.',
    };
  }

  return {
    ok: true as const,
    agentHandle: row.handle,
    token: base.token,
    ownerUserId: row.owner_user_id,
    ownerHandle,
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

