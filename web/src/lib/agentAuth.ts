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
