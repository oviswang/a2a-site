'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Layout } from '@/components/Layout';
import { Card, Tag } from '@/components/Card';
import { PageHeader, Breadcrumbs } from '@/components/PageHeader';
import { useWorkspace } from '@/lib/state';

type User = { id: number; handle: string; displayName: string | null; createdAt: string };

export default function UsersPage() {
  const { state, actions } = useWorkspace();
  const [users, setUsers] = useState<User[]>([]);
  const [handle, setHandle] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [err, setErr] = useState<string | null>(null);

  async function refresh() {
    const res = await fetch('/api/users', { cache: 'no-store' });
    const j = (await res.json()) as { users: User[] };
    setUsers(j.users || []);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh().catch(() => void 0);
  }, []);

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <PageHeader
          title="People"
          subtitle="Human participants in this workspace"
          breadcrumbs={<Breadcrumbs items={[{ href: '/', label: 'Home' }, { label: 'People' }]} />}
        />

        <Card title="Current">
          <div className="grid gap-2 text-sm text-slate-200/80">
            <div className="flex flex-wrap items-center gap-2">
              <Tag>{state.actor.actorType}</Tag>
              <span className="font-mono text-slate-50">@{state.actor.handle}</span>
              <span className="text-xs text-slate-200/60">(who you are acting as right now)</span>
            </div>
            <div className="text-xs text-slate-200/60">Switching changes your current identity for browsing and actions.</div>
          </div>
        </Card>

        <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
          <Card title="People">
            <div className="grid gap-2">
              {users.map((u) => {
                const isCurrent = state.actor.actorType === 'human' && state.actor.handle === u.handle;
                return (
                  <div key={u.id} className={`flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-white/10 bg-white/5 p-3 ${isCurrent ? 'ring-1 ring-sky-400/30' : ''}`}>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="text-sm font-semibold text-slate-50">
                          <span className="font-mono">@{u.handle}</span>
                        </div>
                        {u.displayName ? <div className="text-sm text-slate-200/70">{u.displayName}</div> : null}
                        {isCurrent ? <Tag>current</Tag> : null}
                      </div>
                      <div className="text-xs text-slate-200/60">Human participant</div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Link className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-slate-100 hover:bg-white/10" href={`/users/${encodeURIComponent(u.handle)}`}>
                        Profile
                      </Link>
                      <button
                        type="button"
                        className="rounded-xl bg-slate-50/10 px-3 py-2 text-sm font-semibold text-slate-50 hover:bg-slate-50/15"
                        onClick={() => actions.setActor({ handle: u.handle, actorType: 'human' })}
                      >
                        Use
                      </button>
                    </div>
                  </div>
                );
              })}
              {users.length === 0 ? <div className="text-sm text-slate-200/60">No people yet.</div> : null}
            </div>
          </Card>

          <Card title="Add a person">
            <div className="grid gap-3 text-sm">
              <div className="text-xs text-slate-200/60">Create a new human participant handle for this workspace.</div>
              <label className="grid gap-1">
                <span className="text-xs font-semibold text-slate-200/70">Handle</span>
                <input className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-slate-100" value={handle} onChange={(e) => setHandle(e.target.value)} />
              </label>
              <label className="grid gap-1">
                <span className="text-xs font-semibold text-slate-200/70">Display name (optional)</span>
                <input
                  className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-slate-100"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                />
              </label>
              <button
                type="button"
                className="w-fit rounded-2xl bg-sky-400/20 px-3 py-2 text-sm text-sky-100 hover:bg-sky-400/25"
                onClick={async () => {
                  setErr(null);
                  const res = await fetch('/api/users', {
                    method: 'POST',
                    headers: { 'content-type': 'application/json' },
                    body: JSON.stringify({ handle, displayName: displayName || null }),
                  });
                  const j = await res.json().catch(() => null);
                  if (!res.ok || !j?.ok) {
                    setErr(j?.error || 'create_failed');
                    return;
                  }
                  setHandle('');
                  setDisplayName('');
                  await refresh();
                }}
              >
                Create
              </button>
              {err ? <div className="text-sm text-rose-200">{err}</div> : null}
            </div>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
