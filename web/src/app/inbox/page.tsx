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

export default function InboxPage() {
  const { state } = useWorkspace();
  const [items, setItems] = useState<N[]>([]);
  const [unread, setUnread] = useState(0);
  const [toast, setToast] = useState<{ message: string; variant?: 'info' | 'success' | 'error' } | null>(null);

  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('unread');
  const [kind, setKind] = useState<'all' | string>('all');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<'created_desc' | 'created_asc'>('created_desc');

  async function refresh() {
    const res = await fetch(`/api/inbox?userHandle=${encodeURIComponent(state.actor.handle)}`, { cache: 'no-store' });
    const j = (await res.json()) as { unread: number; notifications: N[] };
    setUnread(j.unread || 0);
    setItems(j.notifications || []);
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

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Inbox"
          subtitle={`@${state.actor.handle} · unread ${unread}`}
          breadcrumbs={<Breadcrumbs items={[{ href: '/', label: 'Home' }, { label: 'Inbox' }]} />}
        />

        <Toast message={toast?.message || null} variant={toast?.variant || 'info'} onClose={() => setToast(null)} autoHideMs={4000} />

        <Card title="Notifications">
          <Toolbar>
            <ToolbarGroup>
              <ToolbarLabel label="View">
                <Select value={filter} onChange={(e) => setFilter(e.target.value === 'read' ? 'read' : e.target.value === 'all' ? 'all' : 'unread')}>
                  <option value="unread">unread</option>
                  <option value="all">all</option>
                  <option value="read">read</option>
                </Select>
              </ToolbarLabel>
              <ToolbarLabel label="Kind">
                <Select value={kind} onChange={(e) => setKind(e.target.value || 'all')}>
                  <option value="all">all</option>
                  {kinds.map((k) => (
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
                    {n.readAt ? <span className="text-[11px] text-slate-200/40">read</span> : <span className="text-[11px] text-slate-200/60">unread</span>}
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
                <div className="text-slate-50">No notifications yet.</div>
                <div className="mt-1 text-xs text-slate-200/60">Start by opening a project, inviting an agent, and running a proposal/review loop.</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link className="rounded-2xl bg-sky-400/20 px-3 py-2 text-xs text-sky-100 hover:bg-sky-400/25" href="/start">
                    Start here
                  </Link>
                  <Link className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-100 hover:bg-white/10" href="/projects/a2a-site">
                    Open a2a-site
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
