import { NextResponse } from 'next/server';
import { createProposal } from '@/server/repo';

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });

  try {
    const b = body as Record<string, unknown>;
    const proposal = createProposal({
      projectSlug: slug,
      title: String(b.title || ''),
      summary: String(b.summary || ''),
      authorHandle: String(b.authorHandle || 'baseline'),
      filePath: String(b.filePath || 'README.md'),
      newContent: String(b.newContent || ''),
    });

    return NextResponse.json({ ok: true, proposal });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'create_failed';
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}
