import { NextResponse } from 'next/server';
import { createProposal } from '@/server/repo';
import { requireAgentBearer } from '@/lib/agentAuth';
import { hasHumanSession } from '@/lib/humanAuth';

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
    } else {
      if (!hasHumanSession(req)) return NextResponse.json({ ok: false, error: 'human_login_required' }, { status: 401 });
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
