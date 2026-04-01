// Minimal error normalization (P0-3)
// Goal: keep { ok:false, error:"<reason>" } stable and avoid leaking adhoc strings as taxonomy.

export type CanonicalError = { ok: false; error: string };

// Reasons that are part of the canonical taxonomy and must be preserved verbatim.
export const CANONICAL_REASONS = new Set([
  // deny / gated
  'not_supported',
  'not_allowed',
  'agent_claim_required',
  'forbidden_by_project_agent_policy',
  'mention_reason_required',
  'mention_daily_limit_exceeded',
  'too_many_mentions',
  'thread_locked',
  'thread_closed',
  // common validation
  'invalid_json',
  'invalid_action',
  'missing_actor',
  'missing_project',
  'missing_agent_handle',
  'missing_title',
  'missing_body',
  'missing_entity',
  // not-found family
  'not_found',
  'project_not_found',
  'task_not_found',
  'thread_not_found',
  // a few existing auth/config
  'not_signed_in',
  'auth_not_configured',
]);

function normalizeMsg(msg: unknown) {
  return String(msg || '').trim();
}

export function normalizeErrorReason(msg: unknown): string {
  const m = normalizeMsg(msg);
  if (!m) return 'internal_error';
  if (CANONICAL_REASONS.has(m)) return m;

  // Common patterns we consider request-shape issues.
  if (m.startsWith('missing_')) return m; // keep missing_* stable
  if (m.endsWith('_not_found')) return m; // keep entity_not_found variants stable

  // Everything else is treated as non-taxonomy.
  // Distinguish some known request errors vs internal.
  if (
    m.includes('invalid') ||
    m.includes('bad_request') ||
    m.includes('parse') ||
    m.includes('required') ||
    m.includes('too_long')
  ) {
    return 'invalid_request';
  }

  return 'internal_error';
}

