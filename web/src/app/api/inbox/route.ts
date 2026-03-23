import { NextResponse } from 'next/server';
import { listNotifications, unreadNotificationCount } from '@/server/repo';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const userHandle = url.searchParams.get('userHandle') || 'local-human';
  const notifications = listNotifications({ userHandle, limit: 100 });
  const unread = unreadNotificationCount(userHandle);
  return NextResponse.json({ ok: true, unread, notifications });
}
