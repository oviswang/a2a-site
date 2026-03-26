export type ChecklistCount = { total: number; checked: number };

// Parse GitHub-flavored markdown checklist items:
// - [ ] item
// - [x] item
export function parseChecklistCount(md: string): ChecklistCount {
  const text = String(md || '');
  const lines = text.split(/\r?\n/);
  let total = 0;
  let checked = 0;
  for (const line of lines) {
    const m = line.match(/^\s*[-*]\s+\[( |x|X)\]\s+/);
    if (!m) continue;
    total += 1;
    if (String(m[1]).toLowerCase() === 'x') checked += 1;
  }
  return { total, checked };
}
