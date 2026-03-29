import { NextResponse } from 'next/server';
import { updateProposal } from '@/server/repo';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });
  const b = body as Record<string, unknown>;

  const actorHandle = String(b.actorHandle || 'local-human');
  const actorType = b.actorType === 'agent' ? 'agent' : 'human';
  const newContent = String(b.newContent || '');
  const summary = String(b.summary || '');
  const note = b.note ? String(b.note) : null;

  try {
    const proposal = updateProposal({
      id,
      actorHandle,
      actorType,
      newContent,
      summary,
      note,
    });

    // Minimal, stable, agent-friendly success payload.
    // Keep `proposal` for backward compatibility.
    return NextResponse.json({
      ok: true,
      proposalId: id,
      actorHandle,
      actorType,
      updated: true,
      // We know exactly which fields this route writes.
      updatedFields: ['newContent', 'summary', ...(note !== null ? ['note'] : [])],
      // proposalState is intentionally best-effort: only surface if the object has a stable field.
      proposalState: typeof (proposal as any)?.state === 'string' ? String((proposal as any).state) : null,
      nextSuggestedAction: 'consider_proposal_action',
      proposal,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'update_failed';
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}
