'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Layout } from '@/components/Layout';
import { Card, Tag } from '@/components/Card';
import { PageHeader, Breadcrumbs } from '@/components/PageHeader';
import { useWorkspace } from '@/lib/state';

type WhoAmI = { signedIn?: boolean; handle?: string; actorType?: string };

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
      .then((j) => setProfile((j?.profile || null) as UserProfile | null))
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

        <Card title="Profile">
          <div className="grid gap-2 text-sm text-slate-200/70">
            <div>
              Handle: <span className="font-mono text-slate-50">@{profile?.user?.handle || meHandle}</span>
            </div>
            <div>
              Joined: <span className="text-slate-200/80">{profile?.user?.createdAt ? String(profile.user.createdAt).slice(0, 10) : '—'}</span>
            </div>
            <div>
              Default identity:{' '}
              {profile?.user?.defaultActorHandle ? (
                <span className="font-mono text-slate-50">
                  @{profile.user.defaultActorHandle}
                  <span className="text-slate-200/60"> ({profile.user.defaultActorType || 'human'})</span>
                </span>
              ) : (
                <span className="text-slate-200/60">Not set</span>
              )}
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

        <Card title="Settings">
          <div className="text-sm text-slate-200/70">
            Settings is now part of your personal area. <Link className="underline decoration-white/20 hover:decoration-white/50" href="/settings">Open Settings</Link>.
          </div>
        </Card>
      </div>
    </Layout>
  );
}
