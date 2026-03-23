import { NextResponse } from 'next/server';
import { createTask } from '@/server/repo';

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });

  const b = body as Record<string, unknown>;
  try {
    const task = createTask({
      projectSlug: slug,
      title: String(b.title || ''),
      description: b.description ? String(b.description) : '',
      filePath: b.filePath ? String(b.filePath) : null,
      actorHandle: String(b.actorHandle || 'local-human'),
      actorType: b.actorType === 'agent' ? 'agent' : 'human',
    });

    return NextResponse.json({ ok: true, task });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'create_failed';
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}
