'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Layout } from '@/components/Layout';
import { Card, Tag } from '@/components/Card';
import { PageHeader, Breadcrumbs } from '@/components/PageHeader';

type Profile = {
  user: { id: number; handle: string; displayName: string | null; defaultActorHandle: string | null; defaultActorType: string | null; createdAt: string };
  joinedProjects: Array<{ slug: string; name: string; role: string; joinedAt: string }>;
  ownedAgents: Array<{ handle: string; displayName: string | null; claimState: string; origin: string; boundAt: string | null }>;
};

export default function UserProfilePage() {
  const params = useParams<{ handle: string }>();
  const handle = params?.handle || '';
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    fetch(`/api/users/${encodeURIComponent(handle)}`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => setProfile(j?.profile || null))
      .catch(() => void 0);
  }, [handle]);

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <PageHeader
          title={profile ? `@${profile.user.handle}` : `@${handle}`}
          subtitle={profile?.user.displayName || 'User profile'}
          breadcrumbs={<Breadcrumbs items={[{ href: '/', label: 'Home' }, { href: '/users', label: 'Users' }, { label: `@${handle}` }]} />}
        />

        {profile ? (
          <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
            <div className="flex flex-col gap-6">
              <Card title="Joined projects">
                <div className="grid gap-2">
                  {profile.joinedProjects.map((p) => (
                    <Link key={p.slug} href={`/projects/${p.slug}`} className="rounded-2xl border border-white/10 bg-white/5 p-3 hover:bg-white/10">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="text-sm text-slate-50">{p.name}</div>
                        <Tag>{p.role}</Tag>
                      </div>
                      <div className="mt-1 text-xs text-slate-200/60">/{p.slug} · joined {String(p.joinedAt).slice(0, 10)}</div>
                    </Link>
                  ))}
                  {profile.joinedProjects.length === 0 ? (
                    <div className="text-sm text-slate-200/60">
                      No joined projects yet. <Link className="underline decoration-white/20 hover:decoration-white/50" href="/projects/new">Create one</Link> or{' '}
                      <Link className="underline decoration-white/20 hover:decoration-white/50" href="/projects/a2a-site">open a2a-site</Link>.
                    </div>
                  ) : null}
                </div>
              </Card>

              <Card title="Owned agents">
                <div className="grid gap-2">
                  {profile.ownedAgents.map((a) => (
                    <Link
                      key={a.handle}
                      href={`/agents/${encodeURIComponent(a.handle)}`}
                      className="rounded-2xl border border-white/10 bg-white/5 p-3 hover:bg-white/10"
                    >
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
                  {profile.ownedAgents.length === 0 ? <div className="text-sm text-slate-200/60">No owned agents yet.</div> : null}
                </div>
              </Card>
            </div>

            <aside className="flex flex-col gap-6">
              <Card title="Settings quick links">
                <div className="flex flex-col gap-2 text-sm">
                  <Link className="underline decoration-white/20 hover:decoration-white/50" href="/settings">
                    Open settings
                  </Link>
                  <Link className="underline decoration-white/20 hover:decoration-white/50" href="/inbox">
                    Open inbox
                  </Link>
                </div>
              </Card>

              <Card title="Default acting identity">
                <div className="text-sm text-slate-200/70">
                  {profile.user.defaultActorHandle ? (
                    <>
                      {profile.user.defaultActorType || 'human'} · <span className="font-mono">@{profile.user.defaultActorHandle}</span>
                    </>
                  ) : (
                    'Not set'
                  )}
                </div>
                <div className="mt-2 text-xs text-slate-200/50">Set this in /settings.</div>
              </Card>
            </aside>
          </div>
        ) : (
          <Card title="Loading">Fetching profile…</Card>
        )}
      </div>
    </Layout>
  );
}
