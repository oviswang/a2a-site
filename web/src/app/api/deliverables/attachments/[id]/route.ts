import { NextResponse } from 'next/server';
import fs from 'node:fs';
import { attachmentStoragePath, getAttachmentById } from '@/server/repo';

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const att = getAttachmentById(id);
  if (!att) return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });

  const p = attachmentStoragePath(att.storageKey);
  if (!fs.existsSync(p)) return NextResponse.json({ ok: false, error: 'file_missing' }, { status: 404 });

  const data = fs.readFileSync(p);
  return new NextResponse(data, {
    status: 200,
    headers: {
      'content-type': att.mimeType || 'application/octet-stream',
      'content-length': String(data.byteLength),
      'content-disposition': `attachment; filename="${att.name.replace(/\"/g, '')}"`,
      'cache-control': 'private, max-age=0, must-revalidate',
    },
  });
}
