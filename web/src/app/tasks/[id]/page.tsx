'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Layout } from '@/components/Layout';
import { Card, Tag } from '@/components/Card';
import { PageHeader, Breadcrumbs } from '@/components/PageHeader';
import { Select } from '@/components/ui';
import type { WorkspaceDeliverable, WorkspaceTask } from '@/lib/state';

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
  const [deliverable, setDeliverable] = useState<WorkspaceDeliverable | null>(null);

  const [summaryMd, setSummaryMd] = useState('');
  const [linksText, setLinksText] = useState('');
  const [revNote, setRevNote] = useState('');
  const [deliverableMsg, setDeliverableMsg] = useState<string | null>(null);

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

    fetch(`/api/tasks/${encodeURIComponent(id)}/deliverable`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        const d = (j?.deliverable || null) as WorkspaceDeliverable | null;
        setDeliverable(d);
        setSummaryMd(d?.summaryMd || '');
        const txt = (d?.evidenceLinks || [])
          .map((x) => {
            const label = (x as any)?.label ? String((x as any).label).trim() : '';
            const url = (x as any)?.url ? String((x as any).url).trim() : '';
            if (!url) return '';
            return label ? `${label} ${url}` : url;
          })
          .filter(Boolean)
          .join('\n');
        setLinksText(txt);
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

            <Card title="Deliverable">
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-white/10 bg-white/5 p-3">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="text-slate-200/70">Status</span>
                  <Tag>{deliverable?.status || 'none'}</Tag>
                  {deliverable?.reviewedAt ? <span className="text-slate-200/50">· reviewed {String(deliverable.reviewedAt).slice(0, 16).replace('T', ' ')}</span> : null}
                  {deliverable?.submittedAt ? <span className="text-slate-200/50">· submitted {String(deliverable.submittedAt).slice(0, 16).replace('T', ' ')}</span> : null}
                </div>
                <div className="text-[11px] text-slate-200/50">This is the formal output of the task.</div>
              </div>

              {deliverable?.status === 'changes_requested' && deliverable.revisionNote ? (
                <div className="mt-3 rounded-2xl border border-amber-400/25 bg-amber-400/10 p-3 text-xs text-amber-100">
                  <div className="font-semibold">Changes requested</div>
                  <div className="mt-1 whitespace-pre-wrap text-amber-100/90">{deliverable.revisionNote}</div>
                </div>
              ) : null}

              <div className="mt-3 grid gap-3">
                <label className="grid gap-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[11px] text-slate-200/60">Deliverable (Markdown template)</span>
                    <button
                      type="button"
                      className="rounded-xl border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-slate-100 hover:bg-white/10"
                      onClick={() => {
                        const tpl = `## Summary\n\n- (one sentence outcome)\n\n## What was done\n\n- \n\n## Evidence\n\n- \n\n## Risks / Notes\n\n- \n\n## Acceptance checklist\n\n- [ ] \n`;
                        if (!summaryMd.trim()) {
                          setSummaryMd(tpl);
                          return;
                        }
                        if (!window.confirm('Replace current deliverable text with the default template?')) return;
                        setSummaryMd(tpl);
                      }}
                    >
                      Insert template
                    </button>
                  </div>
                  <textarea
                    className="min-h-[220px] w-full rounded-2xl border border-white/10 bg-black/20 p-3 text-sm text-slate-100 outline-none focus:border-white/20"
                    value={summaryMd}
                    onChange={(e) => setSummaryMd(e.target.value)}
                    placeholder="Use the template to structure the deliverable: Summary, What was done, Evidence, Risks/Notes, Acceptance checklist."
                  />
                </label>

                <label className="grid gap-1">
                  <span className="text-[11px] text-slate-200/60">Evidence links (one per line)</span>
                  <textarea
                    className="min-h-[88px] w-full rounded-2xl border border-white/10 bg-black/20 p-3 text-sm text-slate-100 outline-none focus:border-white/20"
                    value={linksText}
                    onChange={(e) => setLinksText(e.target.value)}
                    placeholder="label https://...\nhttps://..."
                  />
                </label>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-100 hover:bg-white/10"
                    onClick={async () => {
                      setDeliverableMsg(null);
                      const evidenceLinks = linksText
                        .split('\n')
                        .map((l) => l.trim())
                        .filter(Boolean)
                        .map((l) => {
                          const parts = l.split(/\s+/);
                          if (parts.length >= 2 && parts[0].startsWith('http') === false && parts[1].startsWith('http')) {
                            return { label: parts[0], url: parts.slice(1).join(' ') };
                          }
                          return { url: l };
                        });

                      const res = await fetch(`/api/tasks/${encodeURIComponent(id)}/deliverable`, {
                        method: 'PUT',
                        headers: { 'content-type': 'application/json' },
                        body: JSON.stringify({ actorHandle: (task as any)?.claimedByHandle || 'local-human', actorType: 'human', summaryMd, evidenceLinks }),
                      });
                      const j = await res.json().catch(() => null);
                      if (!res.ok || !j?.ok) {
                        setDeliverableMsg(j?.error || 'save_failed');
                        return;
                      }
                      setDeliverable(j.deliverable || null);
                      setDeliverableMsg('Draft saved.');
                    }}
                  >
                    Save draft
                  </button>

                  <button
                    type="button"
                    className="rounded-xl bg-emerald-700 px-3 py-2 text-xs text-white hover:bg-emerald-600"
                    onClick={async () => {
                      setDeliverableMsg(null);
                      const res = await fetch(`/api/tasks/${encodeURIComponent(id)}/deliverable/submit`, {
                        method: 'POST',
                        headers: { 'content-type': 'application/json' },
                        body: JSON.stringify({ actorHandle: (task as any)?.claimedByHandle || 'local-human', actorType: 'human' }),
                      });
                      const j = await res.json().catch(() => null);
                      if (!res.ok || !j?.ok) {
                        setDeliverableMsg(j?.error || 'submit_failed');
                        return;
                      }
                      setDeliverable(j.deliverable || null);
                      setDeliverableMsg('Submitted for review.');
                    }}
                  >
                    Submit for review
                  </button>

                  {deliverable?.status === 'submitted' ? (
                    <>
                      <button
                        type="button"
                        className="rounded-xl bg-sky-700 px-3 py-2 text-xs text-white hover:bg-sky-600"
                        onClick={async () => {
                          setDeliverableMsg(null);
                          const res = await fetch(`/api/tasks/${encodeURIComponent(id)}/deliverable/review`, {
                            method: 'POST',
                            headers: { 'content-type': 'application/json' },
                            body: JSON.stringify({ action: 'accept', actorHandle: 'local-human', actorType: 'human' }),
                          });
                          const j = await res.json().catch(() => null);
                          if (!res.ok || !j?.ok) {
                            setDeliverableMsg(j?.error || 'accept_failed');
                            return;
                          }
                          setDeliverable(j.deliverable || null);
                          setDeliverableMsg('Accepted.');
                        }}
                      >
                        Accept
                      </button>

                      <div className="flex flex-1 flex-wrap items-center gap-2">
                        <input
                          className="min-w-[200px] flex-1 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs text-slate-100 outline-none focus:border-white/20"
                          value={revNote}
                          onChange={(e) => setRevNote(e.target.value)}
                          placeholder="Revision note (required for changes request)"
                        />
                        <button
                          type="button"
                          className="rounded-xl bg-amber-700 px-3 py-2 text-xs text-white hover:bg-amber-600"
                          onClick={async () => {
                            setDeliverableMsg(null);
                            const res = await fetch(`/api/tasks/${encodeURIComponent(id)}/deliverable/review`, {
                              method: 'POST',
                              headers: { 'content-type': 'application/json' },
                              body: JSON.stringify({ action: 'request_changes', revisionNote: revNote, actorHandle: 'local-human', actorType: 'human' }),
                            });
                            const j = await res.json().catch(() => null);
                            if (!res.ok || !j?.ok) {
                              setDeliverableMsg(j?.error || 'request_changes_failed');
                              return;
                            }
                            setDeliverable(j.deliverable || null);
                            setDeliverableMsg('Changes requested.');
                          }}
                        >
                          Request changes
                        </button>
                      </div>
                    </>
                  ) : null}
                </div>

                {deliverableMsg ? <div className="text-xs text-slate-200/70">{deliverableMsg}</div> : null}
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
