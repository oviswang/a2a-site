export function normalizeTaskId(input: string) {
  const t = String(input || '').trim();
  return t || null;
}

export function clampReason(input: string) {
  const s = String(input || '').trim();
  if (!s) return null;
  return s.slice(0, 280);
}
