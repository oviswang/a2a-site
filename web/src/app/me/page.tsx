'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Layout } from '@/components/Layout';
import { Card, Tag } from '@/components/Card';
import { PageHeader, Breadcrumbs } from '@/components/PageHeader';
import { useWorkspace } from '@/lib/state';

type WhoAmI = { signedIn?: boolean; handle?: string; actorType?: string };

type User = { handle: string; defaultActorHandle: string | null; defaultActorType: string | null };

type Identity = { handle: string; identityType: 'human' | 'agent'; ownerHandle: string | null };

type UserProfile = {
  user: { id: number; handle: string; displayName: string | null; createdAt: string; defaultActorHandle: string | null; defaultActorType: string | null };
  joinedProjects: Array<{ slug: string; name: string; role: string; joinedAt: string }>;
  ownedAgents: Array<{ handle: string; displayName: string | null; claimState: string; origin: string; boundAt: string | null }>;
};

export default function MePage() {
  const router = useRouter();
  const { state, actions } = useWorkspace();

  const [who, setWho] = useState<WhoAmI | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  // Core settings content (merged into /me)
  const [identities, setIdentities] = useState<Identity[]>([]);
  const [defaultType, setDefaultType] = useState<'human' | 'agent'>('human');
  const [defaultHandle, setDefaultHandle] = useState('');
  const [msg, setMsg] = useState<string | null>(null);

  const signedIn = Boolean(who?.signedIn && who?.actorType === 'human' && who?.handle);
  const meHandle = signedIn ? String(who?.handle) : null;

  const breadcrumbs = useMemo(() => <Breadcrumbs items={[{ href: '/', label: 'Home' }, { label: 'Profile' }]} />, []);

  useEffect(() => {
    fetch('/api/auth/whoami', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => setWho((j || null) as WhoAmI | null))
      .catch(() => void 0);
  }, []);

  useEffect(() => {
    if (!meHandle) return;

    fetch(`/api/users/${encodeURIComponent(meHandle)}`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        const p = (j?.profile || null) as UserProfile | null;
        setProfile(p);
        const u = p?.user as unknown as User | undefined;
        if (u) {
          setDefaultType(u.defaultActorType === 'agent' ? 'agent' : 'human');
          setDefaultHandle(u.defaultActorHandle || u.handle);
        }
      })
      .catch(() => void 0);

    fetch('/api/identities', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => setIdentities((j?.identities || []) as Identity[]))
      .catch(() => void 0);
  }, [meHandle]);

  if (!signedIn) {
    // Signed-out: profile entry = login entry.
    return (
      <Layout>
        <div className="flex flex-col gap-6">
          <PageHeader title="Profile" subtitle="Sign in to view your personal area." breadcrumbs={breadcrumbs} />
          <Card title="Not signed in">
            <div className="text-sm text-slate-200/70">
              <Link className="rounded-2xl bg-sky-400/20 px-4 py-2 text-sm font-semibold text-sky-100 hover:bg-sky-400/25" href="/login">
                Continue with X
              </Link>
            </div>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <PageHeader
          title={meHandle ? `@${meHandle}` : 'Profile'}
          subtitle={profile?.user?.displayName || 'Your personal area'}
          breadcrumbs={breadcrumbs}
        />

        <Card title="Signed-in account">
          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-200/80">
            <Tag>human</Tag>
            <span className="font-mono text-slate-50">@{meHandle}</span>
            <span className="text-xs text-slate-200/60">(signed in)</span>
            <form
              className="ml-auto"
              onSubmit={async (e) => {
                e.preventDefault();
                await fetch('/api/auth/logout', { method: 'POST' }).catch(() => void 0);
                actions.setActor({ handle: 'guest', actorType: 'human' });
                router.push('/login');
              }}
            >
              <button type="submit" className="rounded-2xl bg-slate-50/10 px-3 py-2 text-xs text-slate-50 hover:bg-slate-50/15">
                Sign out
              </button>
            </form>
          </div>
        </Card>

        <Card title="Account & settings">
          <div className="grid gap-4 text-sm">
            <div className="grid gap-2 text-slate-200/70">
              <div>
                Handle: <span className="font-mono text-slate-50">@{profile?.user?.handle || meHandle}</span>
              </div>
              <div>
                Joined: <span className="text-slate-200/80">{profile?.user?.createdAt ? String(profile.user.createdAt).slice(0, 10) : '—'}</span>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
              <div className="text-xs font-semibold text-slate-200/70">Default identity</div>
              <div className="mt-2 flex flex-wrap items-end gap-2">
                <label className="grid gap-1">
                  <span className="text-xs text-slate-200/60">Type</span>
                  <select
                    className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100"
                    value={defaultType}
                    onChange={(e) => setDefaultType(e.target.value === 'agent' ? 'agent' : 'human')}
                  >
                    <option value="human">human</option>
                    <option value="agent">agent</option>
                  </select>
                </label>
                <label className="grid gap-1">
                  <span className="text-xs text-slate-200/60">Handle</span>
                  <input
                    className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100"
                    value={defaultHandle}
                    onChange={(e) => setDefaultHandle(e.target.value)}
                    placeholder={defaultType === 'human' ? meHandle || 'me' : 'agent-handle'}
                  />
                </label>

                <button
                  type="button"
                  className="rounded-xl bg-sky-400/20 px-3 py-2 text-sm font-semibold text-sky-100 hover:bg-sky-400/25"
                  onClick={async () => {
                    if (!meHandle) return;
                    setMsg(null);
                    const res = await fetch(`/api/users/${encodeURIComponent(meHandle)}`, {
                      method: 'PATCH',
                      headers: { 'content-type': 'application/json' },
                      body: JSON.stringify({ defaultActorType: defaultType, defaultActorHandle: defaultHandle }),
                    });
                    const j = await res.json().catch(() => null);
                    if (!res.ok || !j?.ok) {
                      setMsg(j?.error || 'save_failed');
                      return;
                    }
                    setMsg('Saved as default.');
                  }}
                >
                  Save
                </button>

                <button
                  type="button"
                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-slate-100 hover:bg-white/10"
                  onClick={() => {
                    if (!defaultHandle) return;
                    actions.setActor({ handle: defaultHandle, actorType: defaultType });
                    setMsg('Using this identity for the current session.');
                  }}
                >
                  Use now
                </button>
              </div>
              {msg ? <div className="mt-2 text-xs text-slate-200/70">{msg}</div> : null}
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
              <div className="text-xs font-semibold text-slate-200/70">Current session</div>
              <div className="mt-2 text-sm text-slate-200/70">
                Acting as <span className="font-mono text-slate-50">@{state.actor.handle}</span> ({state.actor.actorType}).
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
              <div className="text-xs font-semibold text-slate-200/70">Identities</div>
              <div className="mt-2 text-sm text-slate-200/70">
                {(identities || []).length ? (
                  <span>{identities.slice(0, 12).map((i) => `@${i.handle}`).join(', ')}{identities.length > 12 ? '…' : ''}</span>
                ) : (
                  <span className="text-slate-200/60">No identities loaded.</span>
                )}
              </div>
            </div>

            <div className="text-xs text-slate-200/60">
              Settings has moved here. The old <Link className="underline decoration-white/20 hover:decoration-white/50" href="/settings">/settings</Link> page remains for now.
            </div>
          </div>
        </Card>

        <Card title="Joined projects">
          <div className="grid gap-2">
            {(profile?.joinedProjects || []).map((p) => (
              <Link key={p.slug} href={`/projects/${p.slug}`} className="rounded-2xl border border-white/10 bg-white/5 p-3 hover:bg-white/10">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm text-slate-50">{p.name}</div>
                  <Tag>{p.role}</Tag>
                </div>
                <div className="mt-1 text-xs text-slate-200/60">/{p.slug} · joined {String(p.joinedAt).slice(0, 10)}</div>
              </Link>
            ))}
            {(profile?.joinedProjects || []).length === 0 ? (
              <div className="text-sm text-slate-200/60">No joined projects yet.</div>
            ) : null}
          </div>
        </Card>

        <Card title="Owned agents">
          <div className="grid gap-2">
            {(profile?.ownedAgents || []).map((a) => (
              <Link key={a.handle} href={`/agents/${encodeURIComponent(a.handle)}`} className="rounded-2xl border border-white/10 bg-white/5 p-3 hover:bg-white/10">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm text-slate-50">@{a.handle}</div>
                  <div className="flex flex-wrap gap-2">
                    <Tag>{a.origin}</Tag>
                    <Tag>{a.claimState}</Tag>
                  </div>
                </div>
                <div className="mt-1 text-xs text-slate-200/60">{a.displayName || '—'}{a.boundAt ? ` · bound ${String(a.boundAt).slice(0, 10)}` : ''}</div>
              </Link>
            ))}
            {(profile?.ownedAgents || []).length === 0 ? <div className="text-sm text-slate-200/60">No owned agents yet.</div> : null}
          </div>
        </Card>

      </div>
    </Layout>
  );
}
