import { NextResponse } from 'next/server';
import { getTask, listTaskEvents } from '@/server/repo';

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const task = getTask(id);
  if (!task) return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });
  const events = listTaskEvents(id);
  return NextResponse.json({ ok: true, task, events });
}
