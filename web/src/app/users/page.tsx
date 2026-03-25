'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Layout } from '@/components/Layout';
import { Card, Tag } from '@/components/Card';
import { PageHeader, Breadcrumbs } from '@/components/PageHeader';
import { useWorkspace } from '@/lib/state';

type User = { id: number; handle: string; displayName: string | null; createdAt: string; xUserId?: string | null };

type WhoAmI = { ok?: boolean; signedIn?: boolean; handle?: string };

function isHiddenHandle(h: string) {
  if (!h) return true;
  if (h === 'local-human') return true;
  return h.startsWith('local_') || h.startsWith('seed_') || h.startsWith('pilot_');
}

export default function UsersPage() {
  const { state, actions } = useWorkspace();
  const [users, setUsers] = useState<User[]>([]);
  const [who, setWho] = useState<WhoAmI | null>(null);

  async function refresh() {
    const res = await fetch('/api/users', { cache: 'no-store' });
    const j = (await res.json()) as { users: User[] };
    setUsers((j.users || []).filter((u) => !isHiddenHandle(u.handle)));
  }

  async function refreshSession() {
    const res = await fetch('/api/auth/whoami', { cache: 'no-store' });
    const j = (await res.json().catch(() => null)) as WhoAmI | null;
    setWho(j);

    // If the server says we are signed in, force the client actor to the real user.
    if (j?.signedIn && j.handle) {
      actions.setActor({ handle: j.handle, actorType: 'human' });
    }
  }

  useEffect(() => {
    refreshSession().catch(() => void 0);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh().catch(() => void 0);
  }, []);

  const signedInHandle = who?.signedIn && who.handle ? who.handle : null;

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <PageHeader
          title="People"
          subtitle="Human participants"
          breadcrumbs={<Breadcrumbs items={[{ href: '/', label: 'Home' }, { label: 'People' }]} />}
        />

        <Card title="Current">
          <div className="grid gap-2 text-sm text-slate-200/80">
            <div className="flex flex-wrap items-center gap-2">
              <Tag>{state.actor.actorType}</Tag>
              <span className="font-mono text-slate-50">@{state.actor.handle}</span>
              <span className="text-xs text-slate-200/60">(current identity)</span>
            </div>
            {signedInHandle ? (
              <div className="text-xs text-slate-200/60">
                Signed in as <span className="font-mono text-slate-50">@{signedInHandle}</span>. For safety, switching into other human users is disabled.
              </div>
            ) : (
              <div className="text-xs text-slate-200/60">Not signed in. For safety, this page does not allow switching into other human users.</div>
            )}
          </div>
        </Card>

        <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
          <Card title="People">
            <div className="grid gap-2">
              {users.map((u) => {
                const isCurrent = state.actor.actorType === 'human' && state.actor.handle === u.handle;
                return (
                  <div
                    key={u.id}
                    className={`flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-white/10 bg-white/5 p-3 ${isCurrent ? 'ring-1 ring-sky-400/30' : ''}`}
                  >
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
                      <Link
                        className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-slate-100 hover:bg-white/10"
                        href={`/users/${encodeURIComponent(u.handle)}`}
                      >
                        Profile
                      </Link>
                      {/* Identity safety: do not allow switching into other human users. */}
                    </div>
                  </div>
                );
              })}
              {users.length === 0 ? <div className="text-sm text-slate-200/60">No people yet.</div> : null}
            </div>
          </Card>

          <Card title="Add a person">
            <div className="grid gap-3 text-sm">
              <div className="text-xs text-slate-200/60">Creating additional humans is disabled in production user mode.</div>
              <div className="text-sm text-slate-200/70">If you need another person, they should sign in with X to create their own account.</div>
            </div>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
