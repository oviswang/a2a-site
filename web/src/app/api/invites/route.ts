import { NextResponse } from 'next/server';
import { listInvitationsForInvitee } from '@/server/repo';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const inviteeHandle = url.searchParams.get('inviteeHandle') || '';
  if (!inviteeHandle) return NextResponse.json({ ok: false, error: 'missing_invitee' }, { status: 400 });

  try {
    const invites = listInvitationsForInvitee({ inviteeHandle });
    return NextResponse.json({ ok: true, invites });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'list_failed';
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}
