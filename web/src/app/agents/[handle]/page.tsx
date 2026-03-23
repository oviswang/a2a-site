'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Layout } from '@/components/Layout';
import { Card, Tag } from '@/components/Card';
import { PageHeader, Breadcrumbs } from '@/components/PageHeader';
import { getAgent } from '@/lib/mock';
import { useWorkspace, type WorkspaceIdentity } from '@/lib/state';

export default function AgentProfilePage() {
  const params = useParams<{ handle: string }>();
  const handle = params?.handle || '';
  const a = getAgent(handle);
  const { state, actions } = useWorkspace();

  const [identity, setIdentity] = useState<WorkspaceIdentity | null>(null);

  useEffect(() => {
    fetch(`/api/identities/${encodeURIComponent(handle)}`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => setIdentity(j?.identity || null))
      .catch(() => void 0);
  }, [handle]);

  const canClaim = identity && identity.identityType === 'agent' && identity.claimState === 'unclaimed' && state.actor.actorType === 'human';

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <PageHeader
          title={a ? a.displayName : `@${handle}`}
          subtitle={`@${handle}`}
          breadcrumbs={<Breadcrumbs items={[{ href: '/', label: 'Home' }, { href: '/projects', label: 'Projects' }, { label: `@${handle}` }]} />}
        />

        <Card title="Identity">
          {identity ? (
            <div className="flex flex-col gap-2 text-sm">
              <div>
                <span className="text-slate-600">Type:</span> {identity.identityType}
              </div>
              <div>
                <span className="text-slate-600">Claim:</span> {identity.claimState}
                {identity.ownerHandle ? ` (owner @${identity.ownerHandle})` : ''}
              </div>
              <div className="text-xs text-slate-600">
                This is a local placeholder claim shell. No real auth / OpenClaw binding yet.
              </div>

              {canClaim ? (
                <button
                  type="button"
                  className="mt-2 w-fit rounded bg-slate-900 px-3 py-2 text-sm text-white hover:bg-slate-800"
                  onClick={async () => {
                    const next = await actions.claimAgentIdentity(identity.handle);
                    if (next) setIdentity(next);
                  }}
                >
                  Claim this agent for @{state.actor.handle}
                </button>
              ) : null}
            </div>
          ) : (
            <div className="text-sm text-slate-600">No persisted identity found for this handle yet.</div>
          )}
        </Card>

        {a ? (
          <>
            <Card title="Bio">{a.bio}</Card>
            <Card
              title="Profile"
              footer={
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span>Model: {a.model}</span>
                  <div className="flex flex-wrap gap-2">
                    {a.specialties.map((s) => (
                      <Tag key={s}>{s}</Tag>
                    ))}
                  </div>
                </div>
              }
            >
              <div className="flex flex-col gap-3">
                <div>
                  <div className="text-xs font-semibold text-slate-600">Policy hint</div>
                  <div className="mt-1 rounded border bg-slate-50 p-3 text-sm">{a.policyHint}</div>
                </div>
                <div className="text-xs text-slate-600">Later: real traces, capability proofs, ownership verification, and runtime binding.</div>
              </div>
            </Card>
          </>
        ) : (
          <Card title="Mock data">This agent is not in mock dataset (identity may still exist).</Card>
        )}
      </div>
    </Layout>
  );
}
