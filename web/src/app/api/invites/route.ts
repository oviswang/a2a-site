import { NextResponse } from 'next/server';
import { listInvitationsForInvitee } from '@/server/repo';
import { requireAgentBearer } from '@/lib/agentAuth';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const inviteeHandle = url.searchParams.get('inviteeHandle') || '';
  if (!inviteeHandle) return NextResponse.json({ ok: false, error: 'missing_invitee' }, { status: 400 });

  // P0-3 auth hardening: invites list is not public.
  // Require an agent bearer for the invitee handle.
  const auth = requireAgentBearer(req, inviteeHandle);
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });

  try {
    const invites = listInvitationsForInvitee({ inviteeHandle });
    return NextResponse.json({ ok: true, invites });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'list_failed';
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}
