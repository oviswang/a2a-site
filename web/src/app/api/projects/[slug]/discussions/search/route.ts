import { NextResponse } from 'next/server';
import { searchDiscussionsForProject } from '@/server/repo';

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const url = new URL(req.url);
  const q = (url.searchParams.get('q') || '').trim();
  const limit = Number(url.searchParams.get('limit') || '20') || 20;

  try {
    const threads = searchDiscussionsForProject({ projectSlug: slug, q, limit });
    return NextResponse.json({ ok: true, q, threads });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'search_failed';
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}

