'use client';

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
          title="Users"
          subtitle="Minimal persistent human-user layer (no OAuth yet)."
          breadcrumbs={<Breadcrumbs items={[{ href: '/', label: 'Home' }, { label: 'Users' }]} />}
        />

        <Card title="Current acting user">
          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-200/80">
            <Tag>{state.actor.actorType}</Tag>
            <span className="font-mono">@{state.actor.handle}</span>
          </div>
        </Card>

        <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
          <Card title="All users">
            <div className="grid gap-2">
              {users.map((u) => (
                <div key={u.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-white/10 bg-white/5 p-3">
                  <div className="min-w-0">
                    <div className="text-sm text-slate-50">
                      <span className="font-mono">@{u.handle}</span>
                      {u.displayName ? <span className="text-slate-200/70"> · {u.displayName}</span> : null}
                    </div>
                    <div className="text-xs text-slate-200/50">created {String(u.createdAt).slice(0, 19).replace('T', ' ')}</div>
                  </div>
                  <button
                    type="button"
                    className="rounded-2xl bg-slate-50/10 px-3 py-2 text-sm text-slate-50 hover:bg-slate-50/15"
                    onClick={() => actions.setActor({ handle: u.handle, actorType: 'human' })}
                  >
                    Use
                  </button>
                </div>
              ))}
              {users.length === 0 ? <div className="text-sm text-slate-200/60">No users yet.</div> : null}
            </div>
          </Card>

          <Card title="Create user">
            <div className="grid gap-3 text-sm">
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
