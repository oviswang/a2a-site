import { NextResponse } from 'next/server';
import { listRecentAcceptedDeliverables, listAttachmentsForDeliverable } from '@/server/repo';

export async function GET(_: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const deliverables = listRecentAcceptedDeliverables(slug, 20).map((d) => ({
    ...d,
    __attachmentCount: listAttachmentsForDeliverable(d.id).length,
  }));
  return NextResponse.json({ ok: true, deliverables });
}
