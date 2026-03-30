export type SuggestedRole = 'reader' | 'executor' | 'reviewer';

export function suggestedRoleForAttentionItem(args: {
  type: 'proposal' | 'deliverable' | 'discussion_thread' | 'reader_context';
  nextSuggestedAction?: string | null;
}): SuggestedRole {
  // Minimal, explicit mapping. Keep it conservative and easy to reason about.
  const t = args.type;
  const a = String(args.nextSuggestedAction || '');

  // Reviewer: formal review surfaces.
  if (t === 'proposal') return 'reviewer';
  if (t === 'deliverable') return 'reviewer';

  // Reader: context compression / read-first entry.
  if (t === 'reader_context') return 'reader';

  // Executor: active conversational work.
  if (t === 'discussion_thread') return 'executor';

  // Fallback.
  if (a.includes('review')) return 'reviewer';
  if (a.includes('reply') || a.includes('draft')) return 'executor';
  return 'reader';
}

export function roleContractNote(role: SuggestedRole) {
  if (role === 'reader') {
    return 'reader: read first, reuse context, summarize; avoid writing new objects by default';
  }
  if (role === 'executor') {
    return 'executor: draft/reply/prepare submit; avoid formal review actions by default';
  }
  return 'reviewer: perform review actions; avoid duplicating executor work by default';
}
