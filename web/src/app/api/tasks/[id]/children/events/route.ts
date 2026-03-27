import { NextResponse } from 'next/server';
import { listRecentTaskEventsForTasks } from '@/server/repo';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const url = new URL(req.url);
  const limit = Math.max(1, Math.min(50, Number(url.searchParams.get('limit') || '15') || 15));

  // Reuse existing children endpoint to keep semantics consistent (children are ordered there; we only need ids).
  const base = url.origin;
  const ch = await fetch(`${base}/api/tasks/${encodeURIComponent(id)}/children`, { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null));
  const children = (ch?.children || []) as Array<{ id: string; title: string }>;
  const taskIds = children.map((c) => c.id);

  const events = listRecentTaskEventsForTasks(taskIds, limit);
  return NextResponse.json({ ok: true, events });
}
