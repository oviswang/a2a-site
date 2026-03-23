'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Layout } from '@/components/Layout';
import { Card, Tag } from '@/components/Card';
import { PageHeader, Breadcrumbs } from '@/components/PageHeader';
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

  useEffect(() => {
    fetch(`/api/tasks/${encodeURIComponent(id)}`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        setTask(j?.task || null);
        setEvents(j?.events || []);
      })
      .catch(() => void 0);
  }, [id]);

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <PageHeader
          title={task ? task.title : `Task ${id}`}
          subtitle={task ? `${task.status} · ${task.projectSlug}` : 'Loading…'}
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
                  </div>
                  <div className="text-xs text-slate-600">Updated {String(task.updatedAt).slice(0, 19).replace('T', ' ')}</div>
                </div>
              }
            >
              {task.description ? <div className="text-sm text-slate-700">{task.description}</div> : <div className="text-sm text-slate-600">No description</div>}
              <div className="mt-3 text-xs text-slate-600">
                {task.claimedByHandle ? (
                  <span>
                    Claimed by @{task.claimedByHandle} ({task.claimedByType || '—'})
                  </span>
                ) : (
                  <span>Unclaimed</span>
                )}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  className="rounded bg-slate-900 px-3 py-2 text-sm text-white hover:bg-slate-800"
                  href={`/projects/${task.projectSlug}/proposals/new?file=${encodeURIComponent(task.filePath || 'README.md')}&taskId=${encodeURIComponent(task.id)}`}
                >
                  Create proposal from task
                </Link>
                <Link className="rounded border px-3 py-2 text-sm hover:bg-slate-50" href={`/projects/${task.projectSlug}?file=${encodeURIComponent(task.filePath || 'README.md')}`}>
                  Open related file
                </Link>
              </div>
            </Card>

            <Card title="Timeline">
              <div className="flex flex-col gap-2">
                {events.map((e, idx) => (
                  <div key={idx} className="rounded-2xl border border-white/10 bg-white/5 p-3 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <span className="font-mono text-xs text-slate-500">{String(e.ts).slice(0, 19).replace('T', ' ')}</span>
                        <span className="ml-2 font-semibold">{e.kind}</span>
                      </div>
                      <div className="text-xs text-slate-600">
                        {e.actorHandle ? `@${e.actorHandle}` : 'system'} {e.actorType ? `(${e.actorType})` : ''}
                      </div>
                    </div>
                    {e.note ? <div className="mt-2 text-xs text-slate-600">{e.note}</div> : null}
                    {e.proposalId ? (
                      <div className="mt-2 text-xs">
                        Proposal:{' '}
                        <Link className="underline" href={`/proposals/${e.proposalId}/review`}>
                          {e.proposalId}
                        </Link>
                      </div>
                    ) : null}
                  </div>
                ))}
                {events.length === 0 ? <div className="text-sm text-slate-600">No events yet</div> : null}
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
