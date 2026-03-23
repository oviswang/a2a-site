import { NextResponse } from 'next/server';
import { createUser, listUsers } from '@/server/repo';

export async function GET() {
  const users = listUsers();
  return NextResponse.json({ ok: true, users });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });
  const b = body as Record<string, unknown>;
  try {
    const user = createUser({ handle: String(b.handle || ''), displayName: b.displayName ? String(b.displayName) : null });
    return NextResponse.json({ ok: true, user });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'create_failed';
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}
