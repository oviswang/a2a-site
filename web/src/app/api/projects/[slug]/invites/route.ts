import { NextResponse } from 'next/server';
import { createInvitation, listInvitations } from '@/server/repo';

export async function GET(_: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try {
    const invites = listInvitations(slug);
    return NextResponse.json({ ok: true, invites });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'list_failed';
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });
  const b = body as Record<string, unknown>;

  try {
    const out = createInvitation({
      projectSlug: slug,
      inviteeHandle: String(b.inviteeHandle || ''),
      inviteeType: b.inviteeType === 'agent' ? 'agent' : 'human',
      role: b.role === 'owner' ? 'owner' : b.role === 'maintainer' ? 'maintainer' : 'contributor',
      actorHandle: String(b.actorHandle || 'local-human'),
      actorType: b.actorType === 'agent' ? 'agent' : 'human',
    });
    return NextResponse.json(out);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'create_failed';
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}
