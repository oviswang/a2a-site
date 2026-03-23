import { NextResponse } from 'next/server';
import { getProject } from '@/server/repo';

export async function GET(_: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = getProject(slug);
  if (!project) return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });
  // Keep `proposals` as a top-level field for the client store.
  const proposals = Array.isArray((project as Record<string, unknown>).proposals)
    ? ((project as Record<string, unknown>).proposals as unknown[])
    : [];
  const tasks = Array.isArray((project as Record<string, unknown>).tasks) ? ((project as Record<string, unknown>).tasks as unknown[]) : [];
  return NextResponse.json({ ok: true, project, proposals, tasks });
}
