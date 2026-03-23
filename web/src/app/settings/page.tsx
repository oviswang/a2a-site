'use client';

import { useEffect, useState } from 'react';
import { Layout } from '@/components/Layout';
import { Card } from '@/components/Card';
import { PageHeader, Breadcrumbs } from '@/components/PageHeader';
import { useWorkspace } from '@/lib/state';

type User = { handle: string; defaultActorHandle: string | null; defaultActorType: string | null };

type Identity = { handle: string; identityType: 'human' | 'agent'; ownerHandle: string | null };

export default function SettingsPage() {
  const { state, actions } = useWorkspace();
  const me = state.actor.actorType === 'human' ? state.actor.handle : 'local-human';

  const [identities, setIdentities] = useState<Identity[]>([]);
  const [defaultType, setDefaultType] = useState<'human' | 'agent'>('human');
  const [defaultHandle, setDefaultHandle] = useState('');
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
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
  }, [me]);

  const ownedAgents = identities.filter((i) => i.identityType === 'agent' && i.ownerHandle === me);

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <PageHeader title="Settings" subtitle={`@${me}`} breadcrumbs={<Breadcrumbs items={[{ href: '/', label: 'Home' }, { label: 'Settings' }]} />} />

        <Card title="Default acting identity">
          <div className="grid gap-3 text-sm">
            <div className="text-xs text-slate-200/60">
              This controls what identity you automatically operate as after signing in (minimal shell; no auth provider yet).
            </div>

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
                className="rounded-xl bg-sky-400/20 px-3 py-2 text-sm text-sky-100 hover:bg-sky-400/25"
                onClick={async () => {
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
                  setMsg('Saved.');
                }}
              >
                Save
              </button>
              <button
                type="button"
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 hover:bg-white/10"
                onClick={() => {
                  // Apply immediately for the current session
                  actions.setActor({ handle: defaultHandle || me, actorType: defaultType });
                  setMsg('Applied to current session.');
                }}
              >
                Apply now
              </button>
            </div>

            {ownedAgents.length > 0 ? (
              <div className="text-xs text-slate-200/60">Owned agents: {ownedAgents.map((a) => `@${a.handle}`).join(', ')}</div>
            ) : null}

            {msg ? <div className="text-xs text-slate-200/70">{msg}</div> : null}
          </div>
        </Card>

        <Card title="Session note">
          <div className="text-sm text-slate-200/70">
            Sign-in is a minimal selection shell. No passwords, OAuth, or server sessions yet.
          </div>
        </Card>
      </div>
    </Layout>
  );
}
