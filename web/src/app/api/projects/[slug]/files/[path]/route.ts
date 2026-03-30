import { NextResponse } from 'next/server';
import { getDb } from '@/server/db';

const ALLOWED = new Set(['README.md', 'SCOPE.md', 'TODO.md', 'DECISIONS.md']);

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string; path: string }> }) {
  const { slug, path } = await params;
  const fp = decodeURIComponent(String(path || '')).trim();
  if (!ALLOWED.has(fp)) return NextResponse.json({ ok: false, error: 'not_allowed' }, { status: 403 });

  const db = getDb();
  try {
    const row = db
      .prepare(
        `SELECT pf.path AS path, pf.content AS content, pf.updated_at AS updatedAt
         FROM project_files pf
         JOIN projects p ON p.id=pf.project_id
         WHERE p.slug=? AND pf.path=?`
      )
      .get(slug, fp) as { path: string; content: string | null; updatedAt: string | null } | undefined;

    if (!row) return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });
    return NextResponse.json({
      ok: true,
      projectSlug: slug,
      file: {
        path: String(row.path),
        content: String(row.content || ''),
        updatedAt: row.updatedAt ? String(row.updatedAt) : null,
      },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'get_failed';
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}
