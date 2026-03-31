import { sessionCookieName, verifySession } from '@/lib/auth';

function readCookieFromHeader(req: Request, name: string) {
  const raw = req.headers.get('cookie') || '';
  const m = raw.match(new RegExp(`(?:^|;\s*)${name}=([^;]+)`));
  return m ? m[1] : null;
}

// Minimal, route-level gating helper.
// Product rule: human writes require a signed-in human session.
export function hasHumanSession(req: Request): boolean {
  const cookie = (req as any).cookies?.get?.(sessionCookieName())?.value || readCookieFromHeader(req, sessionCookieName()) || null;
  if (!cookie) return false;
  try {
    return !!verifySession(cookie);
  } catch {
    return false;
  }
}

