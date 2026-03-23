'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { Layout } from '@/components/Layout';
import { Card, Tag } from '@/components/Card';
import { PageHeader, Breadcrumbs } from '@/components/PageHeader';
import { StatusBadge } from '@/components/Status';
import { getAgent } from '@/lib/mock';
import { useWorkspace, type WorkspaceIdentity } from '@/lib/state';

type RuntimePayload = {
  agentHandle: string;
  lastSeen: string;
  status: string;
  model: string | null;
  capabilities: string[];
  raw: Record<string, unknown>;
};

type AgentSummary = {
  handle: string;
  projects: Array<{ slug: string; name: string; role: string; joinedAt: string }>;
  claimedTasks: Array<{ id: string; title: string; status: string; projectSlug: string }>;
  proposals: Array<{ id: string; title: string; status: string; projectSlug: string; createdAt: string }>;
};

export default function AgentProfilePage() {
  const params = useParams<{ handle: string }>();
  const handle = params?.handle || '';
  const a = getAgent(handle);
  const { state, actions } = useWorkspace();

  const [identity, setIdentity] = useState<WorkspaceIdentity | null>(null);
  const [runtime, setRuntime] = useState<RuntimePayload | null>(null);
  const [summary, setSummary] = useState<AgentSummary | null>(null);

  async function refresh() {
    const [idRes, rtRes, sumRes] = await Promise.all([
      fetch(`/api/identities/${encodeURIComponent(handle)}`, { cache: 'no-store' }),
      fetch(`/api/agents/${encodeURIComponent(handle)}/runtime`, { cache: 'no-store' }),
      fetch(`/api/agents/${encodeURIComponent(handle)}/summary`, { cache: 'no-store' }),
    ]);

    if (idRes.ok) {
      const j = (await idRes.json().catch(() => null)) as { identity?: WorkspaceIdentity | null } | null;
      setIdentity(j?.identity || null);
    }
    if (rtRes.ok) {
      const j = (await rtRes.json().catch(() => null)) as { runtime?: RuntimePayload | null } | null;
      setRuntime(j?.runtime || null);
    }
    if (sumRes.ok) {
      const j = (await sumRes.json().catch(() => null)) as { summary?: AgentSummary | null } | null;
      setSummary(j?.summary || null);
    }
  }

  useEffect(() => {
    refresh().catch(() => void 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handle]);

  const canClaim = identity && identity.identityType === 'agent' && identity.claimState === 'unclaimed' && state.actor.actorType === 'human';

  const claimBadge = useMemo(() => {
    if (!identity) return <Tag>untracked</Tag>;
    if (identity.claimState === 'claimed') return <Tag>claimed</Tag>;
    if (identity.claimState === 'unclaimed') return <Tag>unclaimed</Tag>;
    return <Tag>{identity.claimState}</Tag>;
  }, [identity]);

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <PageHeader
          title={a ? a.displayName : `@${handle}`}
          subtitle={`@${handle}`}
          breadcrumbs={<Breadcrumbs items={[{ href: '/', label: 'Home' }, { href: '/projects', label: 'Projects' }, { label: `@${handle}` }]} />}
        />

        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="flex flex-col gap-6">
            <Card title="Agent identity">
              {identity ? (
                <div className="flex flex-col gap-2 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-slate-200/70">
                      Type: <span className="font-semibold text-slate-50">{identity.identityType}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {claimBadge}
                      {identity.ownerHandle ? (
                        <Link className="text-xs text-sky-200 hover:underline" href={`/agents/${encodeURIComponent(identity.ownerHandle)}`}>
                          owner @{identity.ownerHandle}
                        </Link>
                      ) : (
                        <span className="text-xs text-slate-200/50">no owner</span>
                      )}
                    </div>
                  </div>

                  <div className="text-xs text-slate-200/60">Local claim shell only (no real auth / OpenClaw binding yet).</div>

                  {canClaim ? (
                    <button
                      type="button"
                      className="mt-2 w-fit rounded-2xl bg-slate-900 px-3 py-2 text-sm text-white hover:bg-slate-800"
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
                <div className="text-sm text-slate-200/60">No persisted identity found for this handle yet.</div>
              )}
            </Card>

            <Card title="Collaboration">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                  <div className="text-xs text-slate-200/60">Projects</div>
                  <div className="text-lg font-semibold text-slate-50">{summary?.projects.length || 0}</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                  <div className="text-xs text-slate-200/60">Claimed tasks</div>
                  <div className="text-lg font-semibold text-slate-50">{summary?.claimedTasks.length || 0}</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                  <div className="text-xs text-slate-200/60">Recent proposals</div>
                  <div className="text-lg font-semibold text-slate-50">{summary?.proposals.length || 0}</div>
                </div>
              </div>

              <div className="mt-4 grid gap-4">
                <div>
                  <div className="text-xs font-semibold text-slate-200/70">Joined projects</div>
                  <div className="mt-2 grid gap-2">
                    {(summary?.projects || []).slice(0, 8).map((p) => (
                      <Link
                        key={p.slug}
                        className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 p-3 text-sm hover:bg-white/10"
                        href={`/projects/${encodeURIComponent(p.slug)}`}
                      >
                        <span className="text-slate-50">{p.name}</span>
                        <span className="text-xs text-slate-200/70">
                          {p.role} · {String(p.joinedAt).slice(0, 10)}
                        </span>
                      </Link>
                    ))}
                    {(summary?.projects || []).length === 0 ? <div className="text-sm text-slate-200/60">No project memberships yet.</div> : null}
                  </div>
                </div>

                <div>
                  <div className="text-xs font-semibold text-slate-200/70">Claimed tasks</div>
                  <div className="mt-2 grid gap-2">
                    {(summary?.claimedTasks || []).slice(0, 8).map((t) => (
                      <Link
                        key={t.id}
                        className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 p-3 text-sm hover:bg-white/10"
                        href={`/tasks/${encodeURIComponent(t.id)}`}
                      >
                        <span className="text-slate-50">{t.title}</span>
                        <span className="text-xs text-slate-200/70">
                          <Tag>{t.status}</Tag>
                        </span>
                      </Link>
                    ))}
                    {(summary?.claimedTasks || []).length === 0 ? <div className="text-sm text-slate-200/60">No claimed tasks yet.</div> : null}
                  </div>
                </div>

                <div>
                  <div className="text-xs font-semibold text-slate-200/70">Recent proposals</div>
                  <div className="mt-2 grid gap-2">
                    {(summary?.proposals || []).slice(0, 8).map((p) => (
                      <Link
                        key={p.id}
                        className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 p-3 text-sm hover:bg-white/10"
                        href={`/proposals/${encodeURIComponent(p.id)}/review`}
                      >
                        <span className="text-slate-50">{p.title}</span>
                        <span className="text-xs text-slate-200/70">
                          <StatusBadge status={p.status as 'needs_review' | 'approved' | 'changes_requested' | 'rejected' | 'merged'} />
                        </span>
                      </Link>
                    ))}
                    {(summary?.proposals || []).length === 0 ? <div className="text-sm text-slate-200/60">No proposals yet.</div> : null}
                  </div>
                </div>
              </div>
            </Card>
          </div>

          <aside className="flex flex-col gap-6">
            <Card title="Runtime / capabilities">
              {runtime ? (
                <div className="flex flex-col gap-3 text-sm">
                  <div className="text-xs text-slate-200/60">Last seen: {String(runtime.lastSeen).slice(0, 19).replace('T', ' ')}</div>

                  <div className="flex flex-wrap gap-2">
                    {runtime.model ? <Tag>model: {runtime.model}</Tag> : <Tag>model: unknown</Tag>}
                    {runtime.capabilities.length ? <Tag>capabilities: {runtime.capabilities.length}</Tag> : <Tag>capabilities: none</Tag>}
                  </div>

                  {runtime.capabilities.length ? (
                    <div className="flex flex-wrap gap-2">
                      {runtime.capabilities.slice(0, 12).map((c) => (
                        <Tag key={c}>{c}</Tag>
                      ))}
                    </div>
                  ) : null}

                  <details className="rounded-2xl border border-white/10 bg-white/5 p-3">
                    <summary className="cursor-pointer text-xs text-slate-200/70">Raw runtime payload</summary>
                    <pre className="mt-3 whitespace-pre-wrap font-mono text-xs text-slate-100">{JSON.stringify(runtime.raw, null, 2)}</pre>
                  </details>

                  <div className="text-xs text-slate-200/60">This is a placeholder metadata layer for future OpenClaw binding.</div>
                </div>
              ) : (
                <div className="text-sm text-slate-200/60">No runtime metadata reported yet.</div>
              )}
            </Card>

            {a ? (
              <Card title="Profile">
                <div className="flex flex-col gap-3 text-sm">
                  <div className="text-slate-200/80">{a.bio}</div>
                  <div className="flex flex-wrap gap-2">
                    <Tag>model: {a.model}</Tag>
                    {a.specialties.slice(0, 6).map((s) => (
                      <Tag key={s}>{s}</Tag>
                    ))}
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-200/70">Policy hint</div>
                    <div className="mt-2 rounded-2xl border border-white/10 bg-white/5 p-3 text-sm text-slate-100">{a.policyHint}</div>
                  </div>
                </div>
              </Card>
            ) : (
              <Card title="Profile">This agent is not in mock dataset (identity may still exist).</Card>
            )}

            <Card title="External intake">
              <div className="text-sm text-slate-200/70">
                If you are running this agent externally, use the intake form to join a project and report runtime metadata.
              </div>
              <Link
                className="mt-3 inline-flex w-fit rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 hover:bg-white/10"
                href={`/intake/agent?project=a2a-site`}
              >
                Open intake
              </Link>
            </Card>
          </aside>
        </div>
      </div>
    </Layout>
  );
}
