import { NextResponse } from 'next/server';
import { baseUrl, requireEnv, sessionCookieName, signSession, isCookieSecure } from '@/lib/auth';
import { upsertUserFromX } from '@/server/repo';

async function exchangeCode(args: { code: string; verifier: string }) {
  const clientId = requireEnv('X_CLIENT_ID');
  const clientSecret = requireEnv('X_CLIENT_SECRET');
  const redirectUri = `${baseUrl()}/api/auth/x/callback`;
  console.error('x_token_redirect_uri', redirectUri);

  const tokenUrl = 'https://api.twitter.com/2/oauth2/token';
  const body = new URLSearchParams();
  body.set('grant_type', 'authorization_code');
  body.set('code', args.code);
  body.set('redirect_uri', redirectUri);
  // For confidential clients using Basic auth, do not include client_id in body.
  body.set('code_verifier', args.verifier);

  // Basic auth is allowed for confidential web apps
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const res = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      authorization: `Basic ${basic}`,
    },
    body,
    cache: 'no-store',
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    // Do not log tokens; response body from X may include error codes only.
    console.error('x_token_exchange_failed', res.status, detail.slice(0, 500));
    throw new Error('token_exchange_failed');
  }
  return (await res.json()) as {
    access_token: string;
    token_type: string;
    expires_in: number;
    scope?: string;
    id_token?: string;
  };
}

async function fetchMe(accessToken: string) {
  const res = await fetch('https://api.twitter.com/2/users/me?user.fields=profile_image_url,name,username', {
    headers: { authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    console.error('x_me_fetch_failed', res.status, detail.slice(0, 500));
    throw new Error('me_fetch_failed');
  }
  return (await res.json()) as { data: { id: string; name: string; username: string; profile_image_url?: string } };
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const err = url.searchParams.get('error');
  const errDesc = url.searchParams.get('error_description');

  if (!code && err) {
    console.error('x_oauth_denied', {
      error: String(err),
      error_description: errDesc ? String(errDesc).slice(0, 300) : null,
      hasCode: Boolean(code),
      hasState: Boolean(state),
    });
    return NextResponse.redirect(`${baseUrl()}/login?error=x_oauth_denied`);
  }

  const cookieState = (req as any).cookies?.get?.('a2a_oauth_state')?.value || null;
  const verifier = (req as any).cookies?.get?.('a2a_oauth_verifier')?.value || null;
  const next = (req as any).cookies?.get?.('a2a_oauth_next')?.value || '/start';

  // Debug (no values): confirm whether callback cookies survived.
  console.error('x_oauth_callback_cookies', {
    hasState: Boolean(cookieState),
    hasVerifier: Boolean(verifier),
    hasNext: Boolean(next),
    hasCode: Boolean(code),
    hasQueryState: Boolean(state),
  });

  if (!code || !state || !cookieState || state !== cookieState || !verifier) {
    return NextResponse.redirect(`${baseUrl()}/login?error=oauth_state`);
  }

  let tok: Awaited<ReturnType<typeof exchangeCode>>;
  try {
    tok = await exchangeCode({ code, verifier });
  } catch {
    // Do not 500 on token exchange failure; allow user to retry.
    return NextResponse.redirect(`${baseUrl()}/login?error=token_exchange_failed`);
  }

  // V1 rollback: identity from /2/users/me (OIDC scopes not enabled on X app).
  let me: Awaited<ReturnType<typeof fetchMe>>;
  try {
    me = await fetchMe(tok.access_token);
  } catch {
    return NextResponse.redirect(`${baseUrl()}/login?error=me_fetch_failed`);
  }

  const xUserId = String(me.data.id);
  const xUsername = String(me.data.username);
  const displayName = me.data.name ? String(me.data.name) : null;
  const avatarUrl = me.data.profile_image_url ? String(me.data.profile_image_url) : null;

  const user = upsertUserFromX({ xUserId, handle: xUsername, displayName, avatarUrl });
  if (!user) return NextResponse.redirect(`${baseUrl()}/login?error=user_upsert`);

  const session = signSession({ user_id: user.id, handle: user.handle, x_user_id: xUserId, iat: Math.floor(Date.now() / 1000) });

  const res = NextResponse.redirect(`${baseUrl()}${next.startsWith('/') ? next : '/start'}`);
  const secure = isCookieSecure();

  res.cookies.set(sessionCookieName(), session, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
    maxAge: 30 * 24 * 60 * 60,
  });

  // clear oauth temp cookies
  res.cookies.set('a2a_oauth_state', '', { httpOnly: true, secure, sameSite: 'lax', path: '/api/auth/x', maxAge: 0 });
  res.cookies.set('a2a_oauth_verifier', '', { httpOnly: true, secure, sameSite: 'lax', path: '/api/auth/x', maxAge: 0 });
  res.cookies.set('a2a_oauth_next', '', { httpOnly: true, secure, sameSite: 'lax', path: '/api/auth/x', maxAge: 0 });

  return res;
}
