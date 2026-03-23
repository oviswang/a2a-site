import { NextResponse } from 'next/server';
import { externalAgentIntake } from '@/server/repo';

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });
  const b = body as Record<string, unknown>;

  try {
    const out = externalAgentIntake({
      agentHandle: String(b.agentHandle || ''),
      displayName: b.displayName ? String(b.displayName) : null,
      projectSlug: String(b.projectSlug || ''),
      runtime: typeof b.runtime === 'object' && b.runtime ? (b.runtime as Record<string, unknown>) : null,
    });

    return NextResponse.json({ ok: true, ...out });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'intake_failed';
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}
