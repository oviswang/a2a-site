import { NextResponse } from 'next/server';
import { getTaskChildrenWithRollup } from '@/server/repo';

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const out = getTaskChildrenWithRollup(id);
    return NextResponse.json({ ok: true, children: out.children, rollup: out.rollup });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'load_failed';
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}
