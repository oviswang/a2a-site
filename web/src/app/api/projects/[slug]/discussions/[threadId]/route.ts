import { NextResponse } from 'next/server';
import { getDiscussionThread } from '@/server/repo';

export async function GET(_: Request, { params }: { params: Promise<{ slug: string; threadId: string }> }) {
  const { slug, threadId } = await params;
  try {
    const out = getDiscussionThread({ projectSlug: slug, threadId });
    return NextResponse.json({ ok: true, thread: out.thread, replies: out.replies, reactions: out.reactions });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'not_found';
    return NextResponse.json({ ok: false, error: msg }, { status: 404 });
  }
}
