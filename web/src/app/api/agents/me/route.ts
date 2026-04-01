import { NextResponse } from 'next/server';
import { requireAgentBearer } from '@/lib/agentAuth';
import { getIdentity } from '@/server/repo';

// agent.whoami
// Minimal self-assertion endpoint for agents.
// The bearer token must match the provided agent handle.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const handle = String(url.searchParams.get('handle') || '').trim();
  if (!handle) return NextResponse.json({ ok: false, error: 'missing_handle' }, { status: 400 });

  const auth = requireAgentBearer(req, handle);
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });

  const ident = getIdentity(handle);
  if (!ident || ident.identityType !== 'agent') return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });

  return NextResponse.json({
    ok: true,
    me: {
      handle: ident.handle,
      identityType: 'agent',
      displayName: ident.displayName,
      claimState: ident.claimState,
      ownerHandle: ident.ownerHandle,
      ownerUserId: ident.ownerUserId ?? null,
    },
  });
}

