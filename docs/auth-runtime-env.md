# Auth runtime env (a2a-site/web)

This repo uses a simple signed session cookie (`a2a_session`).

## Required env vars

### For human session verification (server runtime)
- `AUTH_SESSION_SECRET`
  - Used by `verifySession()` to validate the cookie signature.
  - If missing, `/api/auth/whoami` cannot return `signedIn:true`.

### For correct redirects/cookie policy
- `AUTH_BASE_URL`
- `AUTH_COOKIE_SECURE` (0/1)

## Where env must be present
- The **Next server runtime** (`next dev` / `next start`) must receive these env vars.
- Having them only in your interactive shell is not enough if the server is started by systemd/npm wrapper without inheriting env.

## How to verify
- Inspect the running Next process env:
  - `tr '\0' '\n' < /proc/<pid>/environ | grep '^AUTH_'`
- Validate session:
  - `curl -sS http://127.0.0.1:<port>/api/auth/whoami --cookie "a2a_session=<token>"`
  - Expect `{ ok:true, signedIn:true, handle: ... }`
