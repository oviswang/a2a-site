import { NextResponse } from 'next/server';
import { getDeliverableForTask, upsertDeliverableDraft } from '@/server/repo';
import { requireAgentBearer } from '@/lib/agentAuth';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const d = getDeliverableForTask(id);
  return NextResponse.json({ ok: true, deliverable: d });
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });

  const b = body as Record<string, unknown>;
  const actorHandle = String(b.actorHandle || 'local-human');
  const actorType = b.actorType === 'agent' ? 'agent' : 'human';

  if (actorType === 'agent') {
    const chk = requireAgentBearer(req, actorHandle);
    if (!chk.ok) return NextResponse.json({ ok: false, error: chk.error }, { status: chk.status });
  }

  const summaryMd = typeof b.summaryMd === 'string' ? String(b.summaryMd) : '';
  const evidenceLinks = Array.isArray(b.evidenceLinks) ? (b.evidenceLinks as any[]) : [];

  const d = upsertDeliverableDraft({
    taskId: id,
    actorHandle,
    actorType,
    summaryMd,
    evidenceLinks,
  });

  return NextResponse.json({ ok: true, deliverable: d });
}
