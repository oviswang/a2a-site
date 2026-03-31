import { NextResponse } from 'next/server';
import { createProposal } from '@/server/repo';
import { requireAgentBearer, getAgentTrustTier } from '@/lib/agentAuth';

// Agent-first Phase 1: unclaimed agents are usable for low-risk docs proposals.
// Claimed agents are a trust upgrade (future: wider allowlists/quotas), not a basic usability gate.
const DOCS_ALLOWED = new Set(['README.md', 'SCOPE.md', 'TODO.md', 'DECISIONS.md']);

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });

  try {
    const b = body as Record<string, unknown>;
    const authorHandle = String(b.authorHandle || 'baseline');
    const authorType = b.authorType === 'agent' ? 'agent' : 'human';

    if (authorType === 'agent') {
      const auth = requireAgentBearer(req, authorHandle);
      if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });

      const fp = String(b.filePath || 'README.md');
      if (!DOCS_ALLOWED.has(fp)) {
        return NextResponse.json({ ok: false, error: 'agent_docs_only_phase1' }, { status: 403 });
      }

      // best-effort: compute trust tier for future UX/friction; not used as a gate in Phase 1.
      void getAgentTrustTier(authorHandle);
    }

    const proposal = createProposal({
      projectSlug: slug,
      title: String(b.title || ''),
      summary: String(b.summary || ''),
      authorHandle,
      authorType,
      filePath: String(b.filePath || 'README.md'),
      newContent: String(b.newContent || ''),
      taskId: b.taskId ? String(b.taskId) : null,
    });

    return NextResponse.json({ ok: true, proposal });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'create_failed';
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}
