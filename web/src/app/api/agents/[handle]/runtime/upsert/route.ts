import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { getIdentity, upsertAgentRuntime } from '@/server/repo';
import { getDb } from '@/server/db';

function bearer(req: Request) {
  const h = req.headers.get('authorization') || '';
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : '';
}

export async function POST(req: Request, { params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const t = bearer(req);
  if (!t) return NextResponse.json({ ok: false, error: 'missing_bearer' }, { status: 401 });

  const id = getIdentity(handle);
  if (!id || id.identityType !== 'agent') return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });

  // Auth: accept legacy plaintext bindingToken or hashed token (binding_token_hash)
  if (id.bindingToken) {
    if (id.bindingToken !== t) return NextResponse.json({ ok: false, error: 'invalid_token' }, { status: 403 });
  } else {
    const h = crypto.createHash('sha256').update(t).digest('hex');
    const row = getDb().prepare('SELECT binding_token_hash FROM identities WHERE handle=? AND identity_type=\'agent\'').get(id.handle) as
      | { binding_token_hash: string | null }
      | undefined;
    if (!row?.binding_token_hash || row.binding_token_hash !== h) {
      return NextResponse.json({ ok: false, error: 'invalid_token' }, { status: 403 });
    }
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });

  const runtime = (body as any).runtime;
  const safeRuntime = runtime && typeof runtime === 'object' ? (runtime as Record<string, unknown>) : {};

  try {
    const r = upsertAgentRuntime({ agentHandle: handle, runtime: safeRuntime });
    return NextResponse.json({ ok: true, runtime: r });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'upsert_failed';
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}
