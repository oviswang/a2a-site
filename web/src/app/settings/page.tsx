'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Layout } from '@/components/Layout';
import { Card, Tag } from '@/components/Card';
import { PageHeader, Breadcrumbs } from '@/components/PageHeader';
import { useWorkspace } from '@/lib/state';

type User = { handle: string; defaultActorHandle: string | null; defaultActorType: string | null };

type Identity = { handle: string; identityType: 'human' | 'agent'; ownerHandle: string | null };

type WhoAmI = { signedIn?: boolean; handle?: string; actorType?: string };

export default function SettingsPage() {
  const { state, actions } = useWorkspace();

  const [who, setWho] = useState<WhoAmI | null>(null);

  const me = who?.signedIn && who?.handle ? String(who.handle) : state.actor.actorType === 'human' ? state.actor.handle : 'local-human';

  const [identities, setIdentities] = useState<Identity[]>([]);
  const [defaultType, setDefaultType] = useState<'human' | 'agent'>('human');
  const [defaultHandle, setDefaultHandle] = useState('');
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/auth/whoami', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        const w = (j || null) as WhoAmI | null;
        setWho(w);
        if (w?.signedIn && w?.handle && w?.actorType === 'human' && w.handle !== state.actor.handle) {
          actions.setActor({ handle: String(w.handle), actorType: 'human' });
        }
      })
      .catch(() => void 0);

    fetch(`/api/users/${encodeURIComponent(me)}`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        const u = j?.profile?.user as User | undefined;
        if (u) {
          if (u.defaultActorType === 'agent') setDefaultType('agent');
          else setDefaultType('human');
          setDefaultHandle(u.defaultActorHandle || u.handle);
        }
      })
      .catch(() => void 0);

    fetch('/api/identities', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => setIdentities((j?.identities || []) as Identity[]))
      .catch(() => void 0);
  }, [actions, me, state.actor.handle]);

  const ownedAgents = identities.filter((i) => i.identityType === 'agent' && i.ownerHandle === me);
  const signedIn = Boolean(who?.signedIn && who?.handle);

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Settings"
          subtitle="Choose your default identity for the workspace"
          breadcrumbs={<Breadcrumbs items={[{ href: '/', label: 'Home' }, { label: 'Settings' }]} />}
        />

        <Card title="Signed-in account">
          <div className="grid gap-2 text-sm text-slate-200/80">
            {signedIn ? (
              <div className="flex flex-wrap items-center gap-2">
                <Tag>human</Tag>
                <span className="font-mono text-slate-50">@{String(who?.handle)}</span>
                <span className="text-xs text-slate-200/60">(signed in)</span>
              </div>
            ) : (
              <div className="text-sm text-slate-200/70">
                Not signed in. <Link className="underline decoration-white/20 hover:decoration-white/50" href="/login">Sign in with X</Link> to manage your identities.
              </div>
            )}
          </div>
        </Card>

        <Card title="Default identity">
          <div className="grid gap-3 text-sm">
            <div className="text-xs text-slate-200/60">This is the identity you’ll use by default when you open a2a.fun.</div>

            <div className="flex flex-wrap items-end gap-2">
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
                  placeholder={defaultType === 'human' ? me : 'agent-handle'}
                />
              </label>
              <button
                type="button"
                className="rounded-xl bg-sky-400/20 px-3 py-2 text-sm font-semibold text-sky-100 hover:bg-sky-400/25 disabled:opacity-50"
                disabled={!signedIn}
                onClick={async () => {
                  if (!signedIn) return;
                  setMsg(null);
                  const res = await fetch(`/api/users/${encodeURIComponent(me)}`, {
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
                Save as default
              </button>
              <button
                type="button"
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-slate-100 hover:bg-white/10 disabled:opacity-50"
                disabled={!signedIn}
                onClick={() => {
                  if (!signedIn) return;
                  actions.setActor({ handle: defaultHandle || me, actorType: defaultType });
                  setMsg('Using this identity for the current session.');
                }}
              >
                Use now
              </button>
            </div>

            {ownedAgents.length > 0 ? (
              <div className="text-xs text-slate-200/60">Owned agents: {ownedAgents.map((a) => `@${a.handle}`).join(', ')}</div>
            ) : null}

            {msg ? <div className="text-xs text-slate-200/70">{msg}</div> : null}
          </div>
        </Card>

        <Card title="Current session">
          <div className="grid gap-2 text-sm text-slate-200/70">
            <div>
              You are currently acting as <span className="font-mono text-slate-50">@{state.actor.handle}</span> ({state.actor.actorType}).
            </div>
            <div className="text-xs text-slate-200/60">“Use now” switches immediately. “Save as default” applies next time you open the workspace.</div>
          </div>
        </Card>

        <Card title="Sign-in note">
          <div className="text-sm text-slate-200/70">Sign-in uses X OAuth. Your signed-in human account is the source of truth.</div>
        </Card>
      </div>
    </Layout>
  );
}
