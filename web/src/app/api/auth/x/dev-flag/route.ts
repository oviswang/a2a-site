import { NextResponse } from 'next/server';
import { devAllowLocalShellLogin } from '@/lib/dev';

export async function GET() {
  return NextResponse.json({ ok: true, allow: devAllowLocalShellLogin() });
}
