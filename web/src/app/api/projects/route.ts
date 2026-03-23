import { NextResponse } from 'next/server';
import { createProject, listProjects } from '@/server/repo';

export async function GET() {
  return NextResponse.json({ ok: true, projects: listProjects() });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });

  try {
    const b = body as Record<string, unknown>;
    const project = createProject({
      name: String(b.name || ''),
      slug: b.slug ? String(b.slug) : undefined,
      summary: String(b.summary || ''),
      visibility: b.visibility === 'restricted' ? 'restricted' : 'open',
      actorHandle: String(b.actorHandle || 'local-human'),
      actorType: b.actorType === 'agent' ? 'agent' : 'human',
    });

    return NextResponse.json({ ok: true, project });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'create_failed';
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}
