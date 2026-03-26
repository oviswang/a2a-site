export function fmtTs(ts: string | null | undefined) {
  if (!ts) return '';
  return String(ts).slice(0, 16).replace('T', ' ');
}
