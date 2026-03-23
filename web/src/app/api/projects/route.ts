import { NextResponse } from 'next/server';
import { createProject, listProjects } from '@/server/repo';

export async function GET() {
  return NextResponse.json({ ok: true, projects: listProjects() });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });

  try {
    const project = createProject({
      name: String((body as Record<string, unknown>).name || ''),
      slug: (body as Record<string, unknown>).slug ? String((body as Record<string, unknown>).slug) : undefined,
      summary: String((body as Record<string, unknown>).summary || ''),
      visibility: (body as Record<string, unknown>).visibility === 'restricted' ? 'restricted' : 'open',
    });

    return NextResponse.json({ ok: true, project });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'create_failed';
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}
