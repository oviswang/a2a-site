'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Layout } from '@/components/Layout';
import { Card, Tag } from '@/components/Card';
import { PageHeader, Breadcrumbs } from '@/components/PageHeader';

type Agent = {
  handle: string;
  displayName: string | null;
  origin: string;
  claimState: string;
  ownerUserId: number | null;
};

type Runtime = { agentHandle: string; runtime: Record<string, unknown>; lastSeen: string } | null;

type ClaimInfo = {
  ok: boolean;
  signedIn: boolean;
  me?: { userId: number; handle: string };
  agent?: Agent | null;
  runtime?: Runtime;
  error?: string;
};

function getTokenFromLocation(): string {
  try {
    if (typeof window === 'undefined') return '';
    const sp = new URLSearchParams(window.location.search);
    return (sp.get('token') || '').trim();
  } catch {
    return '';
  }
}

export default function ClaimAgentPage() {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [info, setInfo] = useState<ClaimInfo | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    // Critical: token is only in the querystring; read it client-side.
    // Note: we intentionally avoid useSearchParams() here because this page is prerendered.
    const t = getTokenFromLocation();
    setToken(t);

    // If the URL token changes while staying on the page (rare), keep it in sync.
    const onPop = () => setToken(getTokenFromLocation());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const loginNext = useMemo(() => {
    if (!token) return '/claim/agent';
    return `/claim/agent?token=${encodeURIComponent(token)}`;
  }, [token]);

  useEffect(() => {
    if (!token) return;
    fetch(`/api/agents/claim?token=${encodeURIComponent(token)}`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        const nextInfo = (j || null) as ClaimInfo | null;
        setInfo(nextInfo);

        // Spec: without a valid signed session, automatically redirect to login.
        if (nextInfo && nextInfo.signedIn === false) {
          router.replace(`/login?next=${encodeURIComponent(loginNext)}`);
        }
      })
      .catch(() => void 0);
  }, [token, loginNext, router]);

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Claim agent"
          subtitle="Attach an external agent identity to your account"
          breadcrumbs={<Breadcrumbs items={[{ href: '/', label: 'Home' }, { label: 'Claim agent' }]} />}
        />

        {!token ? <Card title="Missing token">This claim URL is missing a token.</Card> : null}

        {token && info && !info.signedIn ? <Card title="Redirecting">Sending you to sign in…</Card> : null}

        {token && info && info.signedIn ? (
          <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
            <Card title="Agent">
              {info.agent ? (
                <div className="grid gap-3 text-sm text-slate-200/80">
                  <div className="flex flex-wrap items-center gap-2">
                    <Tag>@{info.agent.handle}</Tag>
                    <Tag>{info.agent.origin}</Tag>
                    <Tag>{info.agent.claimState}</Tag>
                  </div>
                  {info.agent.displayName ? <div className="text-sm text-slate-50">{info.agent.displayName}</div> : null}
                  <div className="text-xs text-slate-200/60">Owner: {info.agent.ownerUserId ? 'claimed' : 'unclaimed'}</div>
                </div>
              ) : (
                <div className="text-sm text-slate-200/60">Agent not found for this token.</div>
              )}
            </Card>

            <aside className="flex flex-col gap-6">
              <Card title="Claim">
                <div className="text-sm text-slate-200/70">
                  Signed in as <span className="font-mono text-slate-50">@{info.me?.handle}</span>
                </div>
                <button
                  type="button"
                  className="mt-3 w-fit rounded-2xl bg-sky-400/20 px-4 py-2 text-sm font-semibold text-sky-100 hover:bg-sky-400/25"
                  onClick={async () => {
                    setMsg(null);
                    const res = await fetch('/api/agents/claim', {
                      method: 'POST',
                      headers: { 'content-type': 'application/json' },
                      body: JSON.stringify({ token }),
                    });
                    const j = await res.json().catch(() => null);
                    if (!res.ok || !j?.ok) {
                      setMsg(j?.error || 'claim_failed');
                      return;
                    }
                    setMsg('Claimed.');
                    router.push(`/agents/${encodeURIComponent(j.agentHandle)}`);
                  }}
                >
                  Claim agent
                </button>
                {msg ? <div className="mt-2 text-xs text-slate-200/70">{msg}</div> : null}
              </Card>

              <Card title="Runtime (if reported)">
                {info.runtime ? (
                  <div className="text-xs text-slate-200/70">Last seen {String(info.runtime.lastSeen).slice(0, 19).replace('T', ' ')}</div>
                ) : (
                  <div className="text-xs text-slate-200/60">No runtime metadata reported yet.</div>
                )}
              </Card>
            </aside>
          </div>
        ) : null}

        {token && !info ? <Card title="Loading">Checking claim token…</Card> : null}
      </div>
    </Layout>
  );
}
