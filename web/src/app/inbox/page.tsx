'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Layout } from '@/components/Layout';
import { Card, Tag } from '@/components/Card';
import { PageHeader, Breadcrumbs } from '@/components/PageHeader';
import { useWorkspace } from '@/lib/state';

type N = { id: string; kind: string; text: string; link: string | null; createdAt: string; readAt: string | null };

export default function InboxPage() {
  const { state } = useWorkspace();
  const [items, setItems] = useState<N[]>([]);
  const [unread, setUnread] = useState(0);

  async function markRead(id: string) {
    await fetch(`/api/inbox/${encodeURIComponent(id)}/read`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ userHandle: state.actor.handle }),
    });

    // Refresh after marking.
    const res = await fetch(`/api/inbox?userHandle=${encodeURIComponent(state.actor.handle)}`, { cache: 'no-store' });
    const j = (await res.json()) as { unread: number; notifications: N[] };
    setUnread(j.unread || 0);
    setItems(j.notifications || []);
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch(`/api/inbox?userHandle=${encodeURIComponent(state.actor.handle)}`, { cache: 'no-store' });
      const j = (await res.json()) as { unread: number; notifications: N[] };
      if (cancelled) return;
      setUnread(j.unread || 0);
      setItems(j.notifications || []);
    })().catch(() => void 0);
    return () => {
      cancelled = true;
    };
  }, [state.actor.handle]);

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Inbox"
          subtitle={`@${state.actor.handle} · unread ${unread}`}
          breadcrumbs={<Breadcrumbs items={[{ href: '/', label: 'Home' }, { label: 'Inbox' }]} />}
        />

        <Card title="Notifications">
          <div className="grid gap-2">
            {items.map((n) => (
              <div key={n.id} className="flex flex-wrap items-start justify-between gap-2 rounded-2xl border border-white/10 bg-white/5 p-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    {n.readAt ? <Tag>read</Tag> : <Tag>unread</Tag>}
                    <span className="text-xs text-slate-200/50">{String(n.createdAt).slice(0, 19).replace('T', ' ')}</span>
                    <span className="text-xs text-slate-200/50">{n.kind}</span>
                  </div>
                  <div className="mt-1 text-sm text-slate-50">{n.text}</div>
                  {n.link ? (
                    <div className="mt-2">
                      <Link className="text-xs underline decoration-white/20 hover:decoration-white/50" href={n.link}>
                        Open context
                      </Link>
                    </div>
                  ) : null}
                </div>

                {!n.readAt ? (
                  <button
                    type="button"
                    className="rounded-2xl bg-slate-50/10 px-3 py-2 text-xs text-slate-50 hover:bg-slate-50/15"
                    onClick={() => markRead(n.id).catch(() => void 0)}
                  >
                    Mark read
                  </button>
                ) : null}
              </div>
            ))}
            {items.length === 0 ? (
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
