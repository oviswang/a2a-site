import { NextResponse } from 'next/server';
import { markNotificationRead } from '@/server/repo';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });
  const b = body as Record<string, unknown>;

  try {
    const out = markNotificationRead({ id, userHandle: String(b.userHandle || 'local-human') });
    return NextResponse.json(out);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'read_failed';
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}
