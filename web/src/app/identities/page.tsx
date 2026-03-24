'use client';

import { useEffect, useState } from 'react';
import { Layout } from '@/components/Layout';
import { Card } from '@/components/Card';
import { PageHeader, Breadcrumbs } from '@/components/PageHeader';
import { useWorkspace } from '@/lib/state';

export default function IdentitiesPage() {
  const { state, actions } = useWorkspace();
  const [handle, setHandle] = useState('');
  const [displayName, setDisplayName] = useState('');

  useEffect(() => {
    actions.refreshIdentities?.().catch?.(() => void 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Identities"
          subtitle="Local identity + claim shell (no real auth yet)."
          breadcrumbs={<Breadcrumbs items={[{ href: '/', label: 'Home' }, { label: 'Identities' }]} />}
        />

        <Card title="Acting identity">
          <div className="text-sm">
            Acting as <span className="font-mono">@{state.actor.handle}</span> ({state.actor.actorType})
          </div>
        </Card>

        <Card title="Known identities">
          <div className="flex flex-col gap-2">
            {(state.identities || []).map((id) => (
              <div key={id.handle} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 p-3">
                <div>
                  <div className="font-mono text-sm">@{id.handle}</div>
                  <div className="text-xs text-slate-200/60">
                    {id.identityType} · {id.claimState}
                    {id.ownerHandle ? ` · owner @${id.ownerHandle}` : ''}
                  </div>
                  {id.displayName ? <div className="text-xs text-slate-200/60">{id.displayName}</div> : null}
                </div>

                <button
                  type="button"
                  className="rounded-2xl bg-slate-50/10 px-3 py-2 text-sm text-slate-50 hover:bg-slate-50/15"
                  onClick={() => actions.setActor({ handle: id.handle, actorType: id.identityType })}
                >
                  Set acting
                </button>
              </div>
            ))}
            {(state.identities || []).length === 0 ? <div className="text-sm text-slate-200/60">No identities yet</div> : null}
          </div>
        </Card>

        <Card title="Create local agent identity">
          <div className="grid gap-3">
            <label className="grid gap-1">
              <span className="text-xs font-semibold text-slate-200/70">Handle</span>
              <input
                className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 font-mono text-xs text-slate-100"
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                placeholder="e.g. qa_agent"
              />
            </label>
            <label className="grid gap-1">
              <span className="text-xs font-semibold text-slate-200/70">Display name (optional)</span>
              <input
                className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. QA Agent"
              />
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                className="rounded bg-emerald-700 px-3 py-2 text-sm text-white hover:bg-emerald-600"
                onClick={async () => {
                  await actions.createAgentIdentity?.({ handle, displayName });
                  setHandle('');
                  setDisplayName('');
                }}
              >
                Create agent
              </button>
            </div>
          </div>
        </Card>
      </div>
    </Layout>
  );
}
