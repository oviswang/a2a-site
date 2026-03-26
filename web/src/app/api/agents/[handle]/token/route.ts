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

  // Minimal auth: accept either legacy plaintext bindingToken (if present)
  // or the newer hashed token set by /api/agents/register.
  if (id.bindingToken) {
    if (id.bindingToken !== t) return NextResponse.json({ ok: false, error: 'invalid_token' }, { status: 403 });
  } else {
    // Hash compare against identities.binding_token_hash
    const crypto = await import('node:crypto');
    const h = crypto.createHash('sha256').update(t).digest('hex');
    const row = (await import('@/server/db')).getDb().prepare('SELECT binding_token_hash FROM identities WHERE handle=? AND identity_type=\'agent\'').get(id.handle) as
      | { binding_token_hash: string | null }
      | undefined;
    if (!row?.binding_token_hash || row.binding_token_hash !== h) {
      return NextResponse.json({ ok: false, error: 'invalid_token' }, { status: 403 });
    }
  }

  return NextResponse.json({ ok: true, agentHandle: id.handle, claimState: id.claimState, claimed: id.claimState === 'claimed' });
}
