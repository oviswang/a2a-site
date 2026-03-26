import { NextResponse } from 'next/server';
import { getIdentity } from '@/server/repo';

function bearer(req: Request) {
  const h = req.headers.get('authorization') || '';
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : '';
}

export async function GET(req: Request, { params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const t = bearer(req);
  if (!t) return NextResponse.json({ ok: false, error: 'missing_bearer' }, { status: 401 });

  const id = getIdentity(handle);
  if (!id || id.identityType !== 'agent') return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });

  // Minimal auth: token must match current bindingToken stored for the agent.
  if (!id.bindingToken || id.bindingToken !== t) {
    return NextResponse.json({ ok: false, error: 'invalid_token' }, { status: 403 });
  }

  return NextResponse.json({ ok: true, agentHandle: id.handle, claimState: id.claimState, claimed: id.claimState === 'claimed' });
}
