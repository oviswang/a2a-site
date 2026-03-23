import { NextResponse } from 'next/server';
import { memberAction } from '@/server/repo';

const allowed = new Set(['set_role', 'remove']);

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });
  const b = body as Record<string, unknown>;
  const action = String(b.action || '');
  if (!allowed.has(action)) return NextResponse.json({ ok: false, error: 'invalid_action' }, { status: 400 });

  try {
    const out = memberAction({
      projectSlug: slug,
      action: action as 'set_role' | 'remove',
      memberHandle: String(b.memberHandle || ''),
      memberType: b.memberType === 'agent' ? 'agent' : 'human',
      role: b.role === 'owner' ? 'owner' : b.role === 'maintainer' ? 'maintainer' : 'contributor',
      actorHandle: String(b.actorHandle || 'local-human'),
    });
    return NextResponse.json(out);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'action_failed';
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}
