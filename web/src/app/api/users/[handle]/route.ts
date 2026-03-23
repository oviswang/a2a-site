import { NextResponse } from 'next/server';
import { getUserProfile, updateUserPreferences } from '@/server/repo';

export async function GET(_: Request, { params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const profile = getUserProfile(handle);
  if (!profile) return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true, profile });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });
  const b = body as Record<string, unknown>;

  try {
    const user = updateUserPreferences({
      handle,
      defaultActorHandle: b.defaultActorHandle ? String(b.defaultActorHandle) : null,
      defaultActorType: b.defaultActorType === 'agent' ? 'agent' : b.defaultActorType === 'human' ? 'human' : null,
    });
    return NextResponse.json({ ok: true, user });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'update_failed';
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}
