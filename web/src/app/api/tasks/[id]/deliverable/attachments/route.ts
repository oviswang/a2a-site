import { NextResponse } from 'next/server';
import { createAttachment, getDeliverableForTask, listAttachmentsForTask } from '@/server/repo';
import { requireAgentBearer } from '@/lib/agentAuth';

const MAX_BYTES = 10 * 1024 * 1024; // 10MB MVP cap

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const attachments = listAttachmentsForTask(id);
  return NextResponse.json({ ok: true, attachments });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Parse actor identity from query for minimal MVP (works with form-data uploads).
  const u = new URL(req.url);
  const actorHandle = String(u.searchParams.get('actorHandle') || 'local-human');
  const actorType = u.searchParams.get('actorType') === 'agent' ? 'agent' : 'human';

  if (actorType === 'agent') {
    const auth = requireAgentBearer(req, actorHandle);
    if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }

  const d = getDeliverableForTask(id);
  if (!d) return NextResponse.json({ ok: false, error: 'deliverable_missing' }, { status: 400 });

  let fd: FormData;
  try {
    fd = await req.formData();
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_form_data' }, { status: 400 });
  }

  const file = fd.get('file');
  if (!file || typeof file === 'string') return NextResponse.json({ ok: false, error: 'missing_file' }, { status: 400 });

  const f = file as File;
  const size = Number((f as any).size || 0);
  if (!size) return NextResponse.json({ ok: false, error: 'empty_file' }, { status: 400 });
  if (size > MAX_BYTES) return NextResponse.json({ ok: false, error: 'file_too_large' }, { status: 413 });

  const buf = new Uint8Array(await f.arrayBuffer());
  if (buf.byteLength > MAX_BYTES) return NextResponse.json({ ok: false, error: 'file_too_large' }, { status: 413 });

  const att = createAttachment({
    deliverableId: d.id,
    taskId: d.taskId,
    projectSlug: d.projectSlug,
    name: f.name || 'file',
    mimeType: f.type || 'application/octet-stream',
    sizeBytes: buf.byteLength,
    bytes: buf,
    uploadedByHandle: actorHandle,
    uploadedByType: actorType,
  });

  return NextResponse.json({ ok: true, attachment: att });
}
