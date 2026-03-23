import { NextResponse } from 'next/server';
import { searchAll } from '@/server/repo';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = url.searchParams.get('q') || '';
  const results = searchAll(q);
  return NextResponse.json({ ok: true, results });
}
