'use client';

import { useEffect, useState } from 'react';
import { Layout } from '@/components/Layout';
import { Card, Tag } from '@/components/Card';
import { PageHeader, Breadcrumbs } from '@/components/PageHeader';
import { useWorkspace } from '@/lib/state';

type User = { id: number; handle: string; displayName: string | null; createdAt: string };

export default function LoginPage() {
  const { state, actions } = useWorkspace();
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    fetch('/api/users', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => setUsers((j?.users || []) as User[]))
      .catch(() => void 0);
  }, []);

  const isGuest = state.actor.actorType === 'human' && state.actor.handle === 'local-human';

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Sign in"
          subtitle={isGuest ? 'Choose a user to sign in (no passwords/OAuth yet).' : `Signed in as @${state.actor.handle}`}
          breadcrumbs={<Breadcrumbs items={[{ href: '/', label: 'Home' }, { label: 'Sign in' }]} />}
        />

        <Card title="Current session">
          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-200/80">
            <Tag>{state.actor.actorType}</Tag>
            <span className="font-mono">@{state.actor.handle}</span>
            {isGuest ? <span className="text-xs text-slate-200/50">(guest)</span> : <span className="text-xs text-slate-200/50">(signed in)</span>}
            {!isGuest ? (
              <button
                type="button"
                className="ml-auto rounded-2xl bg-slate-50/10 px-3 py-2 text-xs text-slate-50 hover:bg-slate-50/15"
                onClick={() => actions.setActor({ handle: 'local-human', actorType: 'human' })}
              >
                Sign out
              </button>
            ) : null}
          </div>
        </Card>

        <Card title="Choose a user">
          <div className="grid gap-2">
            {users.map((u) => (
              <button
                key={u.id}
                type="button"
                className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-white/10 bg-white/5 p-3 text-left hover:bg-white/10"
                onClick={async () => {
                  actions.setActor({ handle: u.handle, actorType: 'human' });
                  const res = await fetch(`/api/users/${encodeURIComponent(u.handle)}`, { cache: 'no-store' });
                  const j = await res.json().catch(() => null);
                  const prefType = j?.profile?.user?.defaultActorType;
                  const prefHandle = j?.profile?.user?.defaultActorHandle;
                  if (prefType && prefHandle) {
                    actions.setActor({ handle: String(prefHandle), actorType: prefType === 'agent' ? 'agent' : 'human' });
                  }
                }}
              >
                <div>
                  <div className="text-sm text-slate-50">
                    <span className="font-mono">@{u.handle}</span>
                    {u.displayName ? <span className="text-slate-200/70"> · {u.displayName}</span> : null}
                  </div>
                  <div className="text-xs text-slate-200/50">created {String(u.createdAt).slice(0, 10)}</div>
                </div>
                <span className="text-xs text-slate-200/60">Sign in</span>
              </button>
            ))}
            {users.length === 0 ? <div className="text-sm text-slate-200/60">No users found. Create one in /users.</div> : null}
          </div>
        </Card>
      </div>
    </Layout>
  );
}
