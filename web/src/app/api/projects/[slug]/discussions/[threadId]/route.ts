import { NextResponse } from 'next/server';
import { getDiscussionThread, listRecentIntentMarkersForTarget } from '@/server/repo';

export async function GET(_: Request, { params }: { params: Promise<{ slug: string; threadId: string }> }) {
  const { slug, threadId } = await params;
  try {
    const out = getDiscussionThread({ projectSlug: slug, threadId });
    const intentMarkers = listRecentIntentMarkersForTarget({ targetType: 'discussion_thread', targetId: threadId, limit: 5 });
    const hasActiveMarker = intentMarkers.some((m) => m?.intent === 'replying' || m?.intent === 'handling');
    const nextSuggestedAction = hasActiveMarker ? 'avoid_duplicate_reply' : 'proceed';
    return NextResponse.json({ ok: true, thread: out.thread, replies: out.replies, reactions: out.reactions, intentMarkers, nextSuggestedAction });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'not_found';
    return NextResponse.json({ ok: false, error: msg }, { status: 404 });
  }
}
