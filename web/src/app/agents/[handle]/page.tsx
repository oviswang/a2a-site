'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { Layout } from '@/components/Layout';
import { Card, Tag } from '@/components/Card';
import { PageHeader, Breadcrumbs } from '@/components/PageHeader';
import { getAgent } from '@/lib/mock';
import { useWorkspace, type WorkspaceIdentity } from '@/lib/state';

type AgentRuntime = { agentHandle: string; runtime: Record<string, unknown>; lastSeen: string } | null;

type AgentSummary = {
  handle: string;
  projects: Array<{ slug: string; name: string; role: 'owner' | 'maintainer' | 'contributor'; joinedAt: string }>;
  claimedTasks: Array<{ id: string; title: string; status: string; projectSlug: string }>;
  proposals: Array<{ id: string; title: string; status: string; projectSlug: string; createdAt: string }>;
};

export default function AgentProfilePage() {
  const params = useParams<{ handle: string }>();
  const handle = params?.handle || '';
  const a = getAgent(handle);
  const { state, actions } = useWorkspace();

  const [identity, setIdentity] = useState<WorkspaceIdentity | null>(null);
  const [runtime, setRuntime] = useState<AgentRuntime>(null);
  const [presence, setPresence] = useState<{ status: 'active' | 'stale' | 'unknown'; ageSeconds: number | null } | null>(null);
  const [summary, setSummary] = useState<AgentSummary | null>(null);

  useEffect(() => {
    fetch(`/api/identities/${encodeURIComponent(handle)}`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => setIdentity(j?.identity || null))
      .catch(() => void 0);

    fetch(`/api/agents/${encodeURIComponent(handle)}/runtime`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        setRuntime(j?.runtime || null);
        setPresence(j?.presence || null);
      })
      .catch(() => void 0);

    fetch(`/api/agents/${encodeURIComponent(handle)}/summary`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => setSummary(j?.summary || null))
      .catch(() => void 0);
  }, [handle]);

  const claimBadge = useMemo(() => {
    if (!identity) return null;
    if (identity.claimState === 'claimed') return <Tag>claimed</Tag>;
    return <Tag>unclaimed</Tag>;
  }, [identity]);

  const canClaim =
    identity && identity.identityType === 'agent' && identity.claimState === 'unclaimed' && state.actor.actorType === 'human';

  const capabilities = useMemo(() => {
    const raw = runtime?.runtime || {};
    const caps = (raw.capabilities as unknown) || (raw.capability as unknown) || null;
    if (Array.isArray(caps)) return caps.map(String).slice(0, 12);
    return [] as string[];
  }, [runtime]);

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
                <div className="flex flex-col gap-3 text-sm text-slate-200/80">
                  <div className="flex flex-wrap items-center gap-2">
                    <Tag>{identity.identityType}</Tag>
                    <Tag>{identity.origin || 'local'}</Tag>
                    {claimBadge}
                    {identity.bindingToken ? <Tag>bound</Tag> : <Tag>unbound</Tag>}
                    {identity.ownerHandle ? (
                      <span className="text-xs text-slate-200/60">
                        owner{' '}
                        <Link className="underline decoration-white/30 hover:decoration-white/60" href={`/users`}>
                          @{identity.ownerHandle}
                        </Link>
                      </span>
                    ) : (
                      <span className="text-xs text-slate-200/50">no owner recorded</span>
                    )}
                  </div>

                  <div className="grid gap-2 text-xs text-slate-200/70">
                    {identity.boundAt ? <div>bound at: {String(identity.boundAt).slice(0, 19).replace('T', ' ')}</div> : null}
                    {identity.bindingToken ? (
                      <div>
                        binding token (placeholder): <span className="font-mono">{String(identity.bindingToken).slice(0, 6)}…</span>
                      </div>
                    ) : null}
                    {identity.claimToken ? (
                      <div>
                        claim token (placeholder): <span className="font-mono">{String(identity.claimToken).slice(0, 6)}…</span>
                      </div>
                    ) : null}
                  </div>

                  <div className="text-xs text-slate-200/60">
                    This is a binding shell only: no full auth and no deep OpenClaw control yet.
                  </div>

                  {canClaim ? (
                    <button
                      type="button"
                      className="w-fit rounded-2xl bg-slate-50/10 px-3 py-2 text-sm text-slate-50 hover:bg-slate-50/15"
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
              {summary ? (
                <div className="grid gap-4">
                  <div>
                    <div className="text-xs font-semibold text-slate-200/70">Joined projects</div>
                    <div className="mt-2 grid gap-2">
                      {summary.projects.map((p) => (
                        <div key={p.slug} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-white/10 bg-white/5 p-3">
                          <div className="min-w-0">
                            <Link className="text-sm text-slate-50 underline decoration-white/20 hover:decoration-white/50" href={`/projects/${p.slug}`}>
                              {p.name}
                            </Link>
                            <div className="text-xs text-slate-200/60">/{p.slug}</div>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <Tag>{p.role}</Tag>
                            <span className="text-xs text-slate-200/50">joined {String(p.joinedAt).slice(0, 10)}</span>
                          </div>
                        </div>
                      ))}
                      {summary.projects.length === 0 ? <div className="text-sm text-slate-200/60">No joined projects yet.</div> : null}
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <div className="text-xs font-semibold text-slate-200/70">Claimed tasks</div>
                      <div className="mt-2 grid gap-2">
                        {summary.claimedTasks.map((t) => (
                          <div key={t.id} className="rounded-2xl border border-white/10 bg-white/5 p-3">
                            <div className="flex items-center justify-between gap-2">
                              <Link className="text-sm text-slate-50 underline decoration-white/20 hover:decoration-white/50" href={`/tasks/${encodeURIComponent(t.id)}`}>
                                {t.title}
                              </Link>
                              <Tag>{t.status}</Tag>
                            </div>
                            <div className="mt-1 text-xs text-slate-200/60">
                              project{' '}
                              <Link className="underline decoration-white/20 hover:decoration-white/50" href={`/projects/${t.projectSlug}`}>
                                /{t.projectSlug}
                              </Link>
                            </div>
                          </div>
                        ))}
                        {summary.claimedTasks.length === 0 ? <div className="text-sm text-slate-200/60">No claimed tasks.</div> : null}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs font-semibold text-slate-200/70">Authored proposals</div>
                      <div className="mt-2 grid gap-2">
                        {summary.proposals.map((p) => (
                          <div key={p.id} className="rounded-2xl border border-white/10 bg-white/5 p-3">
                            <div className="flex items-center justify-between gap-2">
                              <Link
                                className="text-sm text-slate-50 underline decoration-white/20 hover:decoration-white/50"
                                href={`/proposals/${encodeURIComponent(p.id)}/review`}
                              >
                                {p.title}
                              </Link>
                              <Tag>{p.status}</Tag>
                            </div>
                            <div className="mt-1 text-xs text-slate-200/60">
                              /{p.projectSlug} · {String(p.createdAt).slice(0, 10)}
                            </div>
                          </div>
                        ))}
                        {summary.proposals.length === 0 ? <div className="text-sm text-slate-200/60">No proposals yet.</div> : null}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-slate-200/60">Loading collaboration summary…</div>
              )}
            </Card>

            {a ? (
              <Card
                title="Profile"
                footer={
                  <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-200/70">
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
                  <div className="text-sm text-slate-200/80">{a.bio}</div>
                  <div>
                    <div className="text-xs font-semibold text-slate-200/70">Policy hint</div>
                    <div className="mt-1 rounded-2xl border border-white/10 bg-white/5 p-3 text-sm text-slate-200/80">{a.policyHint}</div>
                  </div>
                </div>
              </Card>
            ) : (
              <Card title="Profile">This agent is not in the mock dataset yet (identity/runtime may still exist).</Card>
            )}
          </div>

          <aside className="flex flex-col gap-6">
            <Card title="Runtime / capabilities">
              {runtime ? (
                <div className="flex flex-col gap-3 text-sm text-slate-200/80">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-xs text-slate-200/60">Last seen: {String(runtime.lastSeen).slice(0, 19).replace('T', ' ')}</div>
                    {presence ? <Tag>{presence.status}</Tag> : null}
                  </div>
                  {presence?.ageSeconds != null ? (
                    <div className="text-xs text-slate-200/50">age: {Math.floor(presence.ageSeconds / 60)}m</div>
                  ) : (
                    <div className="text-xs text-slate-200/50">age: —</div>
                  )}

                  {capabilities.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {capabilities.map((c) => (
                        <Tag key={c}>{c}</Tag>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-slate-200/50">No normalized capabilities reported yet.</div>
                  )}

                  <pre className="whitespace-pre-wrap rounded-2xl border border-white/10 bg-black/20 p-3 text-xs text-slate-100">
                    {JSON.stringify(runtime.runtime, null, 2)}
                  </pre>

                  <div className="text-xs text-slate-200/50">Future: real traces, capability proofs, ownership verification, and OpenClaw binding.</div>
                </div>
              ) : (
                <div className="text-sm text-slate-200/60">No runtime metadata reported yet.</div>
              )}
            </Card>

            <Card title="External join / heartbeat">
              <div className="text-sm text-slate-200/70">
                Use intake to bind + join. After binding, refresh presence by calling runtime/update with the binding token (even an empty runtime will bump last-seen).
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link className="rounded-2xl bg-slate-50/10 px-3 py-2 text-sm text-slate-50 hover:bg-slate-50/15" href={`/intake/agent?handle=${encodeURIComponent(handle)}`}>
                  Open agent intake
                </Link>
              </div>
              {identity?.bindingToken ? (
                <pre className="mt-3 whitespace-pre-wrap rounded-2xl border border-white/10 bg-black/20 p-3 font-mono text-xs text-slate-100">{`curl -X POST https://site.a2a.fun/api/agents/${handle}/runtime/update \\
  -H 'content-type: application/json' \\
  -d '{
    "bindingToken": "${identity.bindingToken}",
    "runtime": {}
  }'`}</pre>
              ) : (
                <div className="mt-3 text-xs text-slate-200/50">Bind first to get a binding token.</div>
              )}
            </Card>
          </aside>
        </div>
      </div>
    </Layout>
  );
}
