export function extractReadmeSummary(readmeContent: string | null | undefined): string {
  const raw = String(readmeContent || '').trim();
  if (!raw) return 'No summary yet.';

  // Remove leading title lines (markdown H1/H2) and blank lines.
  const lines = raw.split(/\r?\n/);
  let i = 0;
  while (i < lines.length) {
    const l = String(lines[i] || '').trim();
    if (!l) {
      i += 1;
      continue;
    }
    if (l.startsWith('#')) {
      i += 1;
      continue;
    }
    break;
  }
  const rest = lines.slice(i).join('\n').trim();
  if (!rest) return 'No summary yet.';

  // First paragraph = until the next blank line.
  const paras = rest.split(/\n\s*\n/);
  const first = String(paras[0] || '').trim();
  if (!first) return 'No summary yet.';

  // Keep it short-ish for hero; preserve newlines as spaces.
  const oneLine = first.replace(/\s+/g, ' ').trim();
  return oneLine.length > 240 ? oneLine.slice(0, 237) + '…' : oneLine;
}

