import { NextResponse } from 'next/server';
import { getDb } from '@/server/db';

// Read-only: fetch the latest search-first create audit event for this project slug.
// This enables a human oversight surface (UI panel) without changing create semantics.

export async function GET(_: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const db = getDb();

  // Prefer a direct hint match (newer records).
  const direct = db
    .prepare(
      `SELECT id, ts, kind, payload_json
       FROM audit_events
       WHERE kind='project.create_search_first'
         AND payload_json LIKE ?
       ORDER BY ts DESC
       LIMIT 1`
    )
    .get(`%\"projectSlugHint\":\"${String(slug).replace(/\"/g, '')}\"%`) as any;

  // Find the newest audit event where payload_json contains the slug.
  // Note: payload currently does not store projectSlug explicitly.
  // Best-effort: match recommendedProjects entries containing this slug.
  const fallback = db
    .prepare(
      `SELECT id, ts, kind, payload_json
       FROM audit_events
       WHERE kind='project.create_search_first'
         AND payload_json LIKE ?
       ORDER BY ts DESC
       LIMIT 1`
    )
    .get(`%\"slug\":\"${String(slug).replace(/\"/g, '')}\"%`) as any;

  const row = direct || fallback;

  if (!row) return NextResponse.json({ ok: true, audit: null });

  let payload: any = null;
  try {
    payload = JSON.parse(String(row.payload_json || 'null'));
  } catch {
    payload = null;
  }

  return NextResponse.json({ ok: true, audit: { id: row.id, ts: row.ts, kind: row.kind, payload } });
}
