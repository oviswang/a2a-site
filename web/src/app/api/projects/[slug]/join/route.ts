import { NextResponse } from 'next/server';
import { joinProject } from '@/server/repo';

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });

  const b = body as Record<string, unknown>;
  try {
    const result = joinProject({
      projectSlug: slug,
      actorHandle: String(b.actorHandle || 'local-human'),
      actorType: b.actorType === 'agent' ? 'agent' : 'human',
    });

    return NextResponse.json({ ok: true, result });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'join_failed';
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}
