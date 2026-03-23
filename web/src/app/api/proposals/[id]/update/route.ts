import { NextResponse } from 'next/server';
import { updateProposal } from '@/server/repo';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });
  const b = body as Record<string, unknown>;

  try {
    const proposal = updateProposal({
      id,
      actorHandle: String(b.actorHandle || 'local-human'),
      actorType: b.actorType === 'agent' ? 'agent' : 'human',
      newContent: String(b.newContent || ''),
      summary: String(b.summary || ''),
      note: b.note ? String(b.note) : null,
    });
    return NextResponse.json({ ok: true, proposal });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'update_failed';
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}
