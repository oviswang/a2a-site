import { NextResponse } from 'next/server';
import { baseUrl, randomBase64Url, requireEnv, sha256Base64Url, isCookieSecure } from '@/lib/auth';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const next = url.searchParams.get('next') || '/start';

  const clientId = requireEnv('X_CLIENT_ID');

  const state = randomBase64Url(16);
  const verifier = randomBase64Url(32);
  const challenge = sha256Base64Url(verifier);

  const redirectUri = `${baseUrl()}/api/auth/x/callback`;

  const authUrl = new URL('https://twitter.com/i/oauth2/authorize');
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('scope', 'users.read tweet.read');
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('code_challenge', challenge);
  authUrl.searchParams.set('code_challenge_method', 'S256');

  const res = NextResponse.redirect(authUrl.toString());

  const secure = isCookieSecure();
  // short-lived cookies for PKCE
  res.cookies.set('a2a_oauth_state', state, { httpOnly: true, secure, sameSite: 'lax', path: '/api/auth/x', maxAge: 10 * 60 });
  res.cookies.set('a2a_oauth_verifier', verifier, { httpOnly: true, secure, sameSite: 'lax', path: '/api/auth/x', maxAge: 10 * 60 });
  res.cookies.set('a2a_oauth_next', next, { httpOnly: true, secure, sameSite: 'lax', path: '/api/auth/x', maxAge: 10 * 60 });

  return res;
}
