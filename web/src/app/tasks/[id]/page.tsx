'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Layout } from '@/components/Layout';
import { Card, Tag } from '@/components/Card';
import { PageHeader, Breadcrumbs } from '@/components/PageHeader';
import { Button, Select } from '@/components/ui';
import type { WorkspaceTask } from '@/lib/state';

type TaskEvent = {
  ts: string;
  actorHandle: string | null;
  actorType: 'human' | 'agent' | null;
  kind: string;
  note: string | null;
  proposalId: string | null;
};

export default function TaskDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id || '';

  const [task, setTask] = useState<WorkspaceTask | null>(null);
  const [events, setEvents] = useState<TaskEvent[]>([]);

  const [kind, setKind] = useState<'all' | string>('all');
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    fetch(`/api/tasks/${encodeURIComponent(id)}`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        setTask(j?.task || null);
        setEvents(j?.events || []);
      })
      .catch(() => void 0);
  }, [id]);

  const kinds = useMemo(() => Array.from(new Set(events.map((e) => e.kind))).sort(), [events]);

  const visible = useMemo(() => {
    const list = kind === 'all' ? events : events.filter((e) => e.kind === kind);
    return showAll ? list : list.slice(Math.max(0, list.length - 25));
  }, [events, kind, showAll]);

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <PageHeader
          title={task ? task.title : `Task ${id}`}
          subtitle={task ? `/${task.projectSlug} · ${task.status}` : 'Loading…'}
          breadcrumbs={
            <Breadcrumbs
              items={[
                { href: '/', label: 'Home' },
                { href: '/projects', label: 'Projects' },
                { href: task ? `/projects/${task.projectSlug}` : undefined, label: task?.projectSlug || 'project' },
                { label: id },
              ]}
            />
          }
        />

        {task ? (
          <>
            <Card
              title="Task"
              footer={
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap gap-2">
                    <Tag>{task.status}</Tag>
                    {task.filePath ? <Tag>{task.filePath}</Tag> : null}
                    {task.claimedByHandle ? (
                      <Tag>
                        @{task.claimedByHandle}
                        {task.claimedByType ? ` (${task.claimedByType})` : ''}
                      </Tag>
                    ) : (
                      <Tag>unclaimed</Tag>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-200/50">updated {String(task.updatedAt).slice(0, 16).replace('T', ' ')}</div>
                </div>
              }
            >
              {task.description ? <div className="text-sm text-slate-200/80">{task.description}</div> : <div className="text-sm text-slate-200/60">No description</div>}

              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  className="rounded-xl bg-emerald-700 px-3 py-2 text-xs text-white hover:bg-emerald-600"
                  href={`/projects/${task.projectSlug}/proposals/new?file=${encodeURIComponent(task.filePath || 'README.md')}&taskId=${encodeURIComponent(task.id)}`}
                >
                  Propose
                </Link>
                <Link
                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-100 hover:bg-white/10"
                  href={`/projects/${task.projectSlug}?file=${encodeURIComponent(task.filePath || 'README.md')}`}
                >
                  Open file
                </Link>
                <Link className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-100 hover:bg-white/10" href={`/projects/${task.projectSlug}#tasks`}>
                  Back to tasks
                </Link>
              </div>
            </Card>

            <Card title="Timeline">
              <div className="flex flex-wrap items-end justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 p-3">
                <div className="flex flex-wrap items-end gap-2">
                  <label className="grid gap-1">
                    <span className="text-[11px] text-slate-200/60">Kind</span>
                    <Select value={kind} onChange={(e) => setKind(e.target.value || 'all')}>
                      <option value="all">all</option>
                      {kinds.map((k) => (
                        <option key={k} value={k}>
                          {k}
                        </option>
                      ))}
                    </Select>
                  </label>
                  <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-2 py-1 text-xs text-slate-100">
                    <input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} />
                    show all
                  </label>
                </div>
                <div className="text-xs text-slate-200/60">
                  {visible.length} shown · {events.length} total
                </div>
              </div>

              <div className="mt-3 flex flex-col gap-2">
                {visible.map((e, idx) => (
                  <div key={idx} className="rounded-2xl border border-white/10 bg-white/5 p-2 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-[11px] text-slate-200/50">{String(e.ts).slice(0, 16).replace('T', ' ')}</span>
                        <Tag>{e.kind}</Tag>
                        <span className="text-[11px] text-slate-200/60">
                          {e.actorHandle ? `@${e.actorHandle}` : 'system'} {e.actorType ? `(${e.actorType})` : ''}
                        </span>
                      </div>
                      {e.proposalId ? (
                        <Link className="rounded-xl border border-white/10 bg-white/5 px-2 py-1 text-xs text-slate-100 hover:bg-white/10" href={`/proposals/${e.proposalId}/review`}>
                          Proposal
                        </Link>
                      ) : null}
                    </div>
                    {e.note ? <div className="mt-1 text-xs text-slate-200/70">{e.note}</div> : null}
                  </div>
                ))}
                {events.length === 0 ? <div className="text-sm text-slate-200/60">No events yet</div> : null}
              </div>
            </Card>
          </>
        ) : (
          <Card title="Loading">Fetching task…</Card>
        )}
      </div>
    </Layout>
  );
}
