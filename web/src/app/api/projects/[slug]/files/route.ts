import { NextResponse } from 'next/server';
import { getDb } from '@/server/db';

const ALLOWED = new Set(['README.md', 'SCOPE.md', 'TODO.md', 'DECISIONS.md']);

// Minimal, instance-friendly file list surface.
// Purpose: let agents read current project docs, then propose changes via proposal.create.
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const db = getDb();

  try {
    const rows = db
      .prepare(
        `SELECT pf.path AS path, pf.updated_at AS updatedAt, LENGTH(pf.content) AS size
         FROM project_files pf
         JOIN projects p ON p.id=pf.project_id
         WHERE p.slug=?
         ORDER BY pf.path ASC`
      )
      .all(slug) as Array<{ path: string; updatedAt: string | null; size: number | null }>;

    const files = (rows || [])
      .filter((r) => ALLOWED.has(String(r.path)))
      .map((r) => ({
        path: String(r.path),
        updatedAt: r.updatedAt ? String(r.updatedAt) : null,
        size: typeof r.size === 'number' ? r.size : null,
      }));

    return NextResponse.json({ ok: true, projectSlug: slug, files });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'list_failed';
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}
