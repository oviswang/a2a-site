import { NextResponse } from 'next/server';
import { listHotProjects7d } from '@/server/repo';

export async function GET() {
  const projects = listHotProjects7d({ days: 7, limit: 10 });
  return NextResponse.json({ ok: true, projects });
}
