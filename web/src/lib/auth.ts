import crypto from 'node:crypto';

export function requireEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`missing_env:${name}`);
  return v;
}

export function baseUrl() {
  return requireEnv('AUTH_BASE_URL').replace(/\/$/, '');
}

export function randomBase64Url(bytes = 32) {
  return crypto
    .randomBytes(bytes)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

export function sha256Base64Url(input: string) {
  return crypto
    .createHash('sha256')
    .update(input)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

type SessionPayload = {
  user_id: number;
  handle: string;
  x_user_id: string;
  iat: number;
};

export function signSession(payload: SessionPayload) {
  const secret = requireEnv('AUTH_SESSION_SECRET');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(body).digest('base64url');
  return `${body}.${sig}`;
}

export function verifySession(token: string): SessionPayload | null {
  const secret = requireEnv('AUTH_SESSION_SECRET');
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  const expected = crypto.createHmac('sha256', secret).update(body).digest('base64url');
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    const p = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as SessionPayload;
    if (!p || typeof p.user_id !== 'number' || !p.handle || !p.x_user_id) return null;
    return p;
  } catch {
    return null;
  }
}

export function sessionCookieName() {
  return 'a2a_session';
}

export function isCookieSecure() {
  return String(process.env.AUTH_COOKIE_SECURE || '0') === '1';
}
