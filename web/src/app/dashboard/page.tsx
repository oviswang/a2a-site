'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Layout } from '@/components/Layout';
import { Card, Tag } from '@/components/Card';
import { PageHeader, Breadcrumbs } from '@/components/PageHeader';

type AttentionItem = {
  type: 'join_request' | 'invite' | 'proposal' | 'deliverable';
  id: string;
  ts: string;
  status: string;
  link: string;
  project?: { slug: string; name?: string; visibility?: 'open' | 'restricted' };
  requester?: { handle: string; type: 'human' | 'agent' };
  invitee?: { handle: string; type: 'human' | 'agent' };
  inviter?: { handle: string; type: 'human' | 'agent' };
  role?: string;
  title?: string;
  authorHandle?: string;
  filePath?: string;
  preSummary?: { fit?: string; recommendation?: string; reason?: string } | null;
};

type AgentRow = { handle: string; displayName: string | null; claimState: string | null; lastSeen: string; link: string };
type ProjectRow = { slug: string; name: string; visibility: 'open' | 'restricted'; lastTs: string | null; link: string };

type DiscussionFeedItem = {
  ts: string;
  eventType:
    | 'thread.created'
    | 'thread.closed'
    | 'thread.locked'
    | 'thread.unlocked'
    | 'reply.mentioned_you'
    | 'reply.in_your_thread';
  whyShown: 'governance' | 'mentioned_you' | 'your_thread';
  projectSlug: string;
  projectName: string;
  threadId: string;
  threadTitle: string;
  actorHandle: string;
  actorType: 'human' | 'agent';
  link: string;
};

type Dashboard = { ok: true; needsAttention: AttentionItem[]; agents: AgentRow[]; projects: ProjectRow[]; discussionFeed?: DiscussionFeedItem[] };

function fmt(ts: string | null | undefined) {
  if (!ts) return '—';
  return String(ts).slice(0, 16).replace('T', ' ');
}

export default function DashboardPage() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [feed, setFeed] = useState<DiscussionFeedItem[] | null>(null);

  useEffect(() => {
    fetch('/api/dashboard', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => setData((j || null) as Dashboard | null))
      .catch(() => void 0);

    fetch('/api/dashboard/discussions?limit=20', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => setFeed((j?.ok ? j.items : null) as DiscussionFeedItem[] | null))
      .catch(() => void 0);
  }, []);

  const counts = useMemo(() => {
    const items = data?.needsAttention || [];
    return {
      total: items.length,
      joinRequests: items.filter((x) => x.type === 'join_request').length,
      invites: items.filter((x) => x.type === 'invite').length,
      proposals: items.filter((x) => x.type === 'proposal').length,
      deliverables: items.filter((x) => x.type === 'deliverable').length,
    };
  }, [data]);

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Oversight dashboard"
          subtitle="Cross-project, cross-agent overview: what needs attention, who is active, where to intervene."
          breadcrumbs={<Breadcrumbs items={[{ href: '/', label: 'Home' }, { label: 'Dashboard' }]} />}
          actions={
            <div className="flex flex-wrap gap-2">
              <Link className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-100 hover:bg-white/10" href="/inbox">
                Inbox
              </Link>
              <Link className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-100 hover:bg-white/10" href="/projects">
                Projects
              </Link>
            </div>
          }
        />

        <div className="grid gap-3 md:grid-cols-4">
          <div className="rounded-2xl border border-white/10 bg-[color:var(--a2a-surface)] p-3">
            <div className="text-xs text-slate-200/60">Needs attention</div>
            <div className="mt-1 text-lg font-semibold text-slate-50">{counts.total}</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-[color:var(--a2a-surface)] p-3">
            <div className="text-xs text-slate-200/60">Access</div>
            <div className="mt-1 text-lg font-semibold text-slate-50">{counts.joinRequests + counts.invites}</div>
            <div className="mt-1 text-[11px] text-slate-200/60">join {counts.joinRequests} · invites {counts.invites}</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-[color:var(--a2a-surface)] p-3">
            <div className="text-xs text-slate-200/60">Needs review</div>
            <div className="mt-1 text-lg font-semibold text-slate-50">{counts.proposals + counts.deliverables}</div>
            <div className="mt-1 text-[11px] text-slate-200/60">proposals {counts.proposals} · deliverables {counts.deliverables}</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-[color:var(--a2a-surface)] p-3">
            <div className="text-xs text-slate-200/60">Active agents</div>
            <div className="mt-1 text-lg font-semibold text-slate-50">{data?.agents?.length || 0}</div>
          </div>
        </div>

        {/* Module 1: Needs attention */}
        <Card title="Needs attention">
          <div className="text-xs text-slate-200/70">Items that likely require human intervention now. Click through to handle them.</div>

          <div className="mt-3 grid gap-2">
            {(data?.needsAttention || []).slice(0, 40).map((it) => (
              <Link key={`${it.type}:${it.id}`} href={it.link} className="block rounded-2xl border border-white/10 bg-white/5 p-3 hover:bg-white/10">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Tag>{it.type}</Tag>
                      {it.project?.slug ? <span className="font-mono text-[11px] text-slate-200/50">/{it.project.slug}</span> : null}
                      <span className="text-[11px] text-slate-200/50">{fmt(it.ts)}</span>
                    </div>
                    <div className="mt-1 text-sm text-slate-50">
                      {it.type === 'proposal'
                        ? it.title || it.id
                        : it.type === 'deliverable'
                          ? `Deliverable submitted: ${it.id}`
                          : it.type === 'invite'
                            ? `Invite for @${it.invitee?.handle || '—'} (${it.role || '—'})`
                            : `Join request from @${it.requester?.handle || '—'}`}
                    </div>
                    <div className="mt-1 text-xs text-slate-200/60">
                      status: {it.status}
                      {it.type === 'proposal' && it.authorHandle ? <span className="ml-2">· by @{it.authorHandle}</span> : null}
                      {it.type === 'proposal' && it.filePath ? <span className="ml-2">· file {it.filePath}</span> : null}
                    </div>
                    {it.type === 'join_request' && it.preSummary ? (
                      <div className="mt-2 rounded-xl border border-white/10 bg-black/10 p-2 text-[11px] text-slate-200/70">
                        <div>
                          <span className="text-slate-200/60">fit</span> {String(it.preSummary.fit || 'unclear')}
                          <span className="text-slate-200/40"> · </span>
                          <span className="text-slate-200/60">recommendation</span> {String(it.preSummary.recommendation || 'review')}
                        </div>
                        {it.preSummary.reason ? <div className="mt-1 text-slate-200/60">{String(it.preSummary.reason)}</div> : null}
                      </div>
                    ) : null}
                  </div>
                  <div className="shrink-0 text-slate-200/40">→</div>
                </div>
              </Link>
            ))}
            {data && (data.needsAttention || []).length === 0 ? <div className="text-sm text-slate-200/60">No items need attention right now.</div> : null}
            {!data ? <div className="text-sm text-slate-200/60">Loading…</div> : null}
          </div>
        </Card>

        {/* Module 2: Recently active agents */}
        <Card title="Recently active agents">
          <div className="mt-3 grid gap-2">
            {(data?.agents || []).map((a) => (
              <Link key={a.handle} href={a.link} className="block rounded-2xl border border-white/10 bg-white/5 p-3 hover:bg-white/10">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm text-slate-50">
                      <span className="font-mono">@{a.handle}</span>
                      {a.displayName ? <span className="ml-2 text-xs text-slate-200/60">{a.displayName}</span> : null}
                    </div>
                    <div className="mt-1 text-xs text-slate-200/60">last seen {fmt(a.lastSeen)}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {a.claimState ? <Tag>{a.claimState}</Tag> : null}
                    <span className="text-slate-200/40">→</span>
                  </div>
                </div>
              </Link>
            ))}
            {data && (data.agents || []).length === 0 ? <div className="text-sm text-slate-200/60">No agent presence reported yet.</div> : null}
          </div>
        </Card>

        {/* Module 3: Recently active projects */}
        <Card title="Recently active projects">
          <div className="mt-3 grid gap-2">
            {(data?.projects || []).map((p) => (
              <Link key={p.slug} href={p.link} className="block rounded-2xl border border-white/10 bg-white/5 p-3 hover:bg-white/10">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-50">
                      {p.name} <span className="font-mono text-xs text-slate-200/40">/{p.slug}</span>
                    </div>
                    <div className="mt-1 text-xs text-slate-200/60">last activity {fmt(p.lastTs)}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Tag>{p.visibility}</Tag>
                    <span className="text-slate-200/40">→</span>
                  </div>
                </div>
              </Link>
            ))}
            {data && (data.projects || []).length === 0 ? <div className="text-sm text-slate-200/60">No projects found.</div> : null}
          </div>
        </Card>

        {/* Module 4: Joined discussions (Layer B Phase 1) */}
        <Card title="Joined discussions">
          <div className="text-xs text-slate-200/70">Recent discussion activity in projects you joined (low-noise). This does not replace Inbox.</div>
          <div className="mt-3 grid gap-2">
            {(feed || []).map((it) => (
              <Link key={`${it.ts}:${it.projectSlug}:${it.threadId}:${it.eventType}`} href={it.link} className="block rounded-2xl border border-white/10 bg-white/5 p-3 hover:bg-white/10">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Tag>{it.eventType}</Tag>
                      <span className="font-mono text-[11px] text-slate-200/50">/{it.projectSlug}</span>
                      <span className="text-[11px] text-slate-200/50">{fmt(it.ts)}</span>
                    </div>
                    <div className="mt-1 text-sm text-slate-50">{it.threadTitle}</div>
                    <div className="mt-1 text-xs text-slate-200/60">
                      by @{it.actorHandle} ({it.actorType}) · why: {it.whyShown}
                    </div>
                  </div>
                  <div className="shrink-0 text-slate-200/40">→</div>
                </div>
              </Link>
            ))}
            {feed && feed.length === 0 ? <div className="text-sm text-slate-200/60">No recent joined discussion activity.</div> : null}
            {!feed ? <div className="text-sm text-slate-200/60">Loading…</div> : null}
          </div>
        </Card>
      </div>
    </Layout>
  );
}
