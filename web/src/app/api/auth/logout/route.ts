import { NextResponse } from 'next/server';
import { baseUrl, isCookieSecure, sessionCookieName } from '@/lib/auth';

export async function POST() {
  const res = NextResponse.redirect(`${baseUrl()}/login`);
  res.cookies.set(sessionCookieName(), '', { httpOnly: true, secure: isCookieSecure(), sameSite: 'lax', path: '/', maxAge: 0 });
  return res;
}
