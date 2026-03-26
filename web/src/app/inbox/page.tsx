'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Layout } from '@/components/Layout';
import { Card, Tag } from '@/components/Card';
import { PageHeader, Breadcrumbs } from '@/components/PageHeader';
import { Toast } from '@/components/Toast';
import { Toolbar, ToolbarGroup, ToolbarLabel } from '@/components/Toolbar';
import { Button, Input, Select } from '@/components/ui';
import { useWorkspace } from '@/lib/state';

type N = { id: string; kind: string; text: string; link: string | null; createdAt: string; readAt: string | null };

type JoinRequest = {
  id: string;
  requestedAt: string;
  status: string;
  requester: { handle: string; type: 'human' | 'agent' };
  project: { slug: string; name: string; visibility: 'open' | 'restricted' };
  preSummary?: { fit?: string; recommendation?: string; reason?: string } | null;
};

type Invite = {
  id: string;
  status: string;
  role: string;
  inviter: { handle: string; type: 'human' | 'agent' };
  project: { slug: string; name: string; visibility: 'open' | 'restricted' };
  createdAt: string;
};

export default function InboxPage() {
  const { state } = useWorkspace();
  const [items, setItems] = useState<N[]>([]);
  const [unread, setUnread] = useState(0);
  const [toast, setToast] = useState<{ message: string; variant?: 'info' | 'success' | 'error' } | null>(null);

  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);

  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('unread');
  const [kind, setKind] = useState<'all' | string>('all');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<'created_desc' | 'created_asc'>('created_desc');

  async function refresh() {
    const res = await fetch(`/api/inbox?userHandle=${encodeURIComponent(state.actor.handle)}`, { cache: 'no-store' });
    const j = (await res.json()) as { unread: number; notifications: N[] };
    setUnread(j.unread || 0);
    setItems(j.notifications || []);

    // Join requests actionable card feed (human owners/maintainers only).
    if (state.actor.actorType === 'human' && state.actor.handle && state.actor.handle !== 'guest' && state.actor.handle !== 'local-human') {
      const jr = await fetch(`/api/join-requests?approverHandle=${encodeURIComponent(state.actor.handle)}`, { cache: 'no-store' })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null);
      const list = (jr?.requests || []) as any[];
      setJoinRequests(
        list.map((x) => {
          let preSummary = null as any;
          try {
            preSummary = x?.preSummary ? JSON.parse(String(x.preSummary)) : null;
          } catch {
            preSummary = null;
          }
          return { ...x, preSummary } as JoinRequest;
        })
      );
    } else {
      setJoinRequests([]);
    }

    // Invites are delivered to the invitee's Inbox (human handle or agent handle).
    if (state.actor.handle && state.actor.handle !== 'guest' && state.actor.handle !== 'local-human') {
      const inv = await fetch(`/api/invites?inviteeHandle=${encodeURIComponent(state.actor.handle)}`, { cache: 'no-store' })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null);
      setInvites((inv?.invites || []) as Invite[]);
    } else {
      setInvites([]);
    }
  }

  async function markRead(id: string) {
    const res = await fetch(`/api/inbox/${encodeURIComponent(id)}/read`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ userHandle: state.actor.handle }),
    });

    setToast(res.ok ? { message: 'Marked read.', variant: 'success' } : { message: 'Mark read failed.', variant: 'error' });
    await refresh();
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await refresh();
    })().catch(() => void 0);
    return () => {
      cancelled = true;
    };
  }, [state.actor.handle]);

  const kinds = Array.from(new Set(items.map((n) => n.kind))).sort();

  const visible = [...items]
    .filter((n) => {
      if (filter === 'unread' && n.readAt) return false;
      if (filter === 'read' && !n.readAt) return false;
      if (kind !== 'all' && n.kind !== kind) return false;
      const q = query.trim().toLowerCase();
      if (!q) return true;
      return `${n.text}\n${n.kind}\n${n.id}`.toLowerCase().includes(q);
    })
    .sort((a, b) => (sort === 'created_asc' ? String(a.createdAt).localeCompare(String(b.createdAt)) : String(b.createdAt).localeCompare(String(a.createdAt))));

  const visibleUnread = visible.filter((n) => !n.readAt);

  const counts = {
    unread,
    needsReview: visible.filter((n) => !n.readAt && String(n.kind).includes('proposal.needs_review')).length,
    access: visible.filter((n) => !n.readAt && (String(n.kind).includes('join.requested') || String(n.kind).includes('invite.'))).length,
    merged: visible.filter((n) => !n.readAt && String(n.kind).includes('proposal.merged')).length,
  };

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Inbox"
          subtitle={unread ? `${unread} need attention` : 'Nothing needs your attention right now.'}
          breadcrumbs={<Breadcrumbs items={[{ href: '/', label: 'Home' }, { label: 'Inbox' }]} />}
        />

        <Toast message={toast?.message || null} variant={toast?.variant || 'info'} onClose={() => setToast(null)} autoHideMs={4000} />

        <div className="grid gap-3 md:grid-cols-4">
          <div className="rounded-2xl border border-white/10 bg-[color:var(--a2a-surface)] p-3">
            <div className="text-xs text-slate-200/60">Unread</div>
            <div className="mt-1 text-lg font-semibold text-slate-50">{counts.unread}</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-[color:var(--a2a-surface)] p-3">
            <div className="text-xs text-slate-200/60">Needs review</div>
            <div className="mt-1 text-lg font-semibold text-slate-50">{counts.needsReview}</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-[color:var(--a2a-surface)] p-3">
            <div className="text-xs text-slate-200/60">Access</div>
            <div className="mt-1 text-lg font-semibold text-slate-50">{counts.access}</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-[color:var(--a2a-surface)] p-3">
            <div className="text-xs text-slate-200/60">Recent merges</div>
            <div className="mt-1 text-lg font-semibold text-slate-50">{counts.merged}</div>
          </div>
        </div>

        {joinRequests.length ? (
          <div className="rounded-3xl border border-emerald-400/20 bg-emerald-400/5 p-4 backdrop-blur sm:p-5">
            <div className="flex items-end justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-slate-50">Access requests</div>
                <div className="mt-0.5 text-xs text-slate-200/70">Needs approval (restricted projects)</div>
              </div>
              <span className="rounded-full bg-emerald-400/10 px-2 py-0.5 text-xs text-emerald-100">{joinRequests.length}</span>
            </div>

            <div className="mt-3 grid gap-2">
              {joinRequests.map((jr) => (
                <div key={jr.id} className="rounded-2xl border border-emerald-400/20 bg-[color:var(--a2a-surface)] p-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="text-sm text-slate-50">
                        <span className="font-mono">@{jr.requester.handle}</span>{' '}
                        <span className="text-slate-200/60">({jr.requester.type})</span>
                        <span className="text-slate-200/40"> → </span>
                        <Link className="underline decoration-white/20 hover:decoration-white/50" href={`/projects/${jr.project.slug}#people`}>
                          /{jr.project.slug}
                        </Link>
                      </div>
                      <div className="mt-1 text-xs text-slate-200/60">{jr.project.name} · requested {String(jr.requestedAt).slice(0, 16).replace('T', ' ')}</div>

                      {jr.preSummary ? (
                        <div className="mt-2 rounded-xl border border-white/10 bg-black/10 p-2 text-xs text-slate-200/70">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-slate-200/60">Fit:</span>
                            <span className="text-slate-50">{String(jr.preSummary.fit || 'unclear')}</span>
                            <span className="text-slate-200/40">·</span>
                            <span className="text-slate-200/60">Recommendation:</span>
                            <span className="text-slate-50">{String(jr.preSummary.recommendation || 'review')}</span>
                          </div>
                          {jr.preSummary.reason ? <div className="mt-1 text-slate-200/60">{String(jr.preSummary.reason)}</div> : null}
                        </div>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        className="rounded-xl bg-emerald-400/20 px-3 py-2 text-xs font-semibold text-emerald-100 hover:bg-emerald-400/25"
                        onClick={async () => {
                          const res = await fetch(`/api/join-requests/${encodeURIComponent(jr.id)}/action`, {
                            method: 'POST',
                            headers: { 'content-type': 'application/json' },
                            body: JSON.stringify({ action: 'approve', role: 'contributor', actorHandle: state.actor.handle }),
                          });
                          const ok = res.ok;
                          setToast(ok ? { message: 'Approved access.', variant: 'success' } : { message: 'Approve failed.', variant: 'error' });
                          await refresh();
                        }}
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        className="rounded-xl bg-rose-500/15 px-3 py-2 text-xs font-semibold text-rose-100 hover:bg-rose-500/20"
                        onClick={async () => {
                          const res = await fetch(`/api/join-requests/${encodeURIComponent(jr.id)}/action`, {
                            method: 'POST',
                            headers: { 'content-type': 'application/json' },
                            body: JSON.stringify({ action: 'reject', actorHandle: state.actor.handle }),
                          });
                          const ok = res.ok;
                          setToast(ok ? { message: 'Rejected request.', variant: 'success' } : { message: 'Reject failed.', variant: 'error' });
                          await refresh();
                        }}
                      >
                        Reject
                      </button>
                      <Link className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-100 hover:bg-white/10" href={`/projects/${jr.project.slug}#people`}>
                        Review
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {invites.length ? (
          <div className="rounded-3xl border border-sky-400/20 bg-sky-400/5 p-4 backdrop-blur sm:p-5">
            <div className="flex items-end justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-slate-50">Invites</div>
                <div className="mt-0.5 text-xs text-slate-200/70">Needs a response (accept/decline)</div>
              </div>
              <span className="rounded-full bg-sky-400/10 px-2 py-0.5 text-xs text-sky-100">{invites.length}</span>
            </div>

            <div className="mt-3 grid gap-2">
              {invites.map((inv) => (
                <div key={inv.id} className="rounded-2xl border border-sky-400/20 bg-[color:var(--a2a-surface)] p-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="text-sm text-slate-50">
                        <span className="text-slate-200/60">Invited by </span>
                        <span className="font-mono">@{inv.inviter.handle}</span>
                        <span className="text-slate-200/60"> as {inv.role}</span>
                        <span className="text-slate-200/40"> → </span>
                        <Link className="underline decoration-white/20 hover:decoration-white/50" href={`/projects/${inv.project.slug}#people`}>
                          /{inv.project.slug}
                        </Link>
                      </div>
                      <div className="mt-1 text-xs text-slate-200/60">{inv.project.name} · invited {String(inv.createdAt).slice(0, 16).replace('T', ' ')}</div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        className="rounded-xl bg-sky-400/20 px-3 py-2 text-xs font-semibold text-sky-100 hover:bg-sky-400/25"
                        onClick={async () => {
                          const res = await fetch(`/api/invites/${encodeURIComponent(inv.id)}/respond`, {
                            method: 'POST',
                            headers: { 'content-type': 'application/json' },
                            body: JSON.stringify({ action: 'accept', actorHandle: state.actor.handle, actorType: state.actor.actorType }),
                          });
                          const ok = res.ok;
                          setToast(ok ? { message: 'Invite accepted.', variant: 'success' } : { message: 'Accept failed.', variant: 'error' });
                          await refresh();
                        }}
                      >
                        Accept
                      </button>
                      <button
                        type="button"
                        className="rounded-xl bg-slate-50/10 px-3 py-2 text-xs font-semibold text-slate-50 hover:bg-slate-50/15"
                        onClick={async () => {
                          const res = await fetch(`/api/invites/${encodeURIComponent(inv.id)}/respond`, {
                            method: 'POST',
                            headers: { 'content-type': 'application/json' },
                            body: JSON.stringify({ action: 'decline', actorHandle: state.actor.handle, actorType: state.actor.actorType }),
                          });
                          const ok = res.ok;
                          setToast(ok ? { message: 'Invite declined.', variant: 'success' } : { message: 'Decline failed.', variant: 'error' });
                          await refresh();
                        }}
                      >
                        Decline
                      </button>
                      <Link className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-100 hover:bg-white/10" href={`/projects/${inv.project.slug}#people`}>
                        View
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <Card title="Signals">
          <Toolbar>
            <ToolbarGroup>
              <ToolbarLabel label="View">
                <Select value={filter} onChange={(e) => setFilter(e.target.value === 'read' ? 'read' : e.target.value === 'all' ? 'all' : 'unread')}>
                  <option value="unread">Unread</option>
                  <option value="all">All</option>
                  <option value="read">Read</option>
                </Select>
              </ToolbarLabel>
              <ToolbarLabel label="Filter">
                <Select value={kind} onChange={(e) => setKind(e.target.value || 'all')}>
                  <option value="all">All</option>
                  <option value="proposal.needs_review">Needs review</option>
                  <option value="join.requested">Access</option>
                  <option value="invite.created">Access</option>
                  <option value="invite.revoked">Access</option>
                  {kinds
                    .filter((k) => !['proposal.needs_review', 'join.requested', 'invite.created', 'invite.revoked'].includes(k))
                    .map((k) => (
                      <option key={k} value={k}>
                        {k}
                      </option>
                    ))}
                </Select>
              </ToolbarLabel>
              <ToolbarLabel label="Search">
                <Input className="w-[240px] px-2 py-1 text-xs" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="text" />
              </ToolbarLabel>
              <ToolbarLabel label="Sort">
                <Select value={sort} onChange={(e) => setSort(e.target.value === 'created_asc' ? 'created_asc' : 'created_desc')}>
                  <option value="created_desc">newest</option>
                  <option value="created_asc">oldest</option>
                </Select>
              </ToolbarLabel>
            </ToolbarGroup>

            <div className="flex flex-wrap items-center gap-2">
              <div className="text-xs text-slate-200/60">{visible.length} shown · {visibleUnread.length} unread</div>
              {visibleUnread.length ? (
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={async () => {
                    if (!window.confirm(`Mark ${visibleUnread.length} notifications as read?`)) return;
                    await Promise.all(
                      visibleUnread.map((n) =>
                        fetch(`/api/inbox/${encodeURIComponent(n.id)}/read`, {
                          method: 'POST',
                          headers: { 'content-type': 'application/json' },
                          body: JSON.stringify({ userHandle: state.actor.handle }),
                        }).catch(() => void 0)
                      )
                    );
                    setToast({ message: `Marked ${visibleUnread.length} as read.`, variant: 'success' });
                    await refresh();
                  }}
                >
                  Mark visible read
                </Button>
              ) : null}
            </div>
          </Toolbar>

          <div className="mt-3 rounded-xl border border-white/10 bg-[color:var(--a2a-surface)]">
            {visible.map((n, idx) => (
              <div key={n.id} className={`flex flex-wrap items-center justify-between gap-2 px-4 py-3 hover:bg-white/5 ${idx === 0 ? '' : 'border-t border-white/10'}`}>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    {!n.readAt ? <span className="h-2 w-2 rounded-full bg-sky-300" /> : <span className="h-2 w-2 rounded-full bg-white/10" />}
                    <Tag>{n.kind}</Tag>
                    <span className="text-[11px] text-slate-200/50">{String(n.createdAt).slice(0, 16).replace('T', ' ')}</span>
                  </div>
                  <div className="mt-1 truncate text-sm text-slate-50">{n.text}</div>
                </div>

                <div className="flex items-center gap-2">
                  {n.link ? (
                    <Link className="rounded-xl border border-white/10 bg-white/5 px-2 py-1 text-xs text-slate-100 hover:bg-white/10" href={n.link}>
                      Open
                    </Link>
                  ) : null}
                  {!n.readAt ? (
                    <button
                      type="button"
                      className="rounded-xl bg-slate-50/10 px-2 py-1 text-xs text-slate-50 hover:bg-slate-50/15"
                      onClick={() => markRead(n.id).catch(() => void 0)}
                    >
                      Read
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
            {visible.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200/70">
                <div className="text-slate-50">Nothing needs your attention right now.</div>
                <div className="mt-1 text-xs text-slate-200/60">Signals show up here when work comes back to you (needs review, access, changes, merges).</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link className="rounded-2xl bg-sky-400/20 px-3 py-2 text-xs text-sky-100 hover:bg-sky-400/25" href="/projects">
                    Open projects
                  </Link>
                  <Link className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-100 hover:bg-white/10" href="/search">
                    Search
                  </Link>
                </div>
              </div>
            ) : null}
          </div>
        </Card>
      </div>
    </Layout>
  );
}
