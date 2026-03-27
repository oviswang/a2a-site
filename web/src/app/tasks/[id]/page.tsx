'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Layout } from '@/components/Layout';
import { Card, Tag } from '@/components/Card';
import { PageHeader, Breadcrumbs } from '@/components/PageHeader';
import { Select } from '@/components/ui';
import type { WorkspaceDeliverable, WorkspaceTask } from '@/lib/state';
import { parseChecklistCount } from '@/lib/checklist';
import { fmtTs } from '@/lib/time';

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

  const [children, setChildren] = useState<WorkspaceTask[]>([]);
  const [rollup, setRollup] = useState<{ total: number; open: number; inProgressOrClaimed: number; completed: number; submitted: number; changesRequested: number; accepted: number; noAcceptedResult?: number; noDeliverableOrNotSubmitted?: number } | null>(null);
  const [childDeliverables, setChildDeliverables] = useState<Record<string, WorkspaceDeliverable | null>>({});

  const [summaryMd, setSummaryMd] = useState('');
  const [linksText, setLinksText] = useState('');
  const [revNote, setRevNote] = useState('');
  const [deliverableMsg, setDeliverableMsg] = useState<string | null>(null);

  const [attachments, setAttachments] = useState<Array<{ id: string; name: string; mimeType: string; sizeBytes: number; createdAt: string }>>([]);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadMsg, setUploadMsg] = useState<string | null>(null);

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

    fetch(`/api/tasks/${encodeURIComponent(id)}/deliverable/attachments`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => setAttachments((j?.attachments || []) as any[]))
      .catch(() => void 0);

    fetch(`/api/tasks/${encodeURIComponent(id)}/children`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        setChildren((j?.children || []) as WorkspaceTask[]);
        setRollup(j?.rollup || null);
        setChildDeliverables((j?.deliverablesByTaskId || {}) as Record<string, WorkspaceDeliverable | null>);
      })
      .catch(() => void 0);
  }, [id]);

  const kinds = useMemo(() => Array.from(new Set(events.map((e) => e.kind))).sort(), [events]);

  const visible = useMemo(() => {
    const list = kind === 'all' ? events : events.filter((e) => e.kind === kind);
    return showAll ? list : list.slice(Math.max(0, list.length - 25));
  }, [events, kind, showAll]);

  const acceptedChildren = useMemo(() => {
    return children
      .map((t) => ({ t, d: childDeliverables[t.id] || null }))
      .filter((x) => x.d && x.d.status === 'accepted')
      .sort((a, b) => String((b.d as any)?.reviewedAt || (b.d as any)?.updatedAt || '').localeCompare(String((a.d as any)?.reviewedAt || (a.d as any)?.updatedAt || '')));
  }, [children, childDeliverables]);

  const reviewSignals = useMemo(() => {
    const submitted: Array<{ t: WorkspaceTask; d: WorkspaceDeliverable }> = [];
    const changesRequested: Array<{ t: WorkspaceTask; d: WorkspaceDeliverable }> = [];
    for (const t of children) {
      const d = childDeliverables[t.id];
      if (!d) continue;
      if (d.status === 'submitted') submitted.push({ t, d });
      if (d.status === 'changes_requested') changesRequested.push({ t, d });
    }
    return {
      submitted: submitted.sort((a, b) => String(b.d.submittedAt || b.d.updatedAt).localeCompare(String(a.d.submittedAt || a.d.updatedAt))),
      changesRequested: changesRequested.sort((a, b) => String(b.d.reviewedAt || b.d.updatedAt).localeCompare(String(a.d.reviewedAt || a.d.updatedAt))),
    };
  }, [children, childDeliverables]);

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <PageHeader
          title={task ? task.title : `Task ${id}`}
          subtitle={
            task
              ? `/${task.projectSlug} · ${task.status}${task.isBlocked ? ' · BLOCKED' : ''}${task.parentTaskId ? ` · child of ${task.parentTaskId}` : ''}`
              : 'Loading…'
          }
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
            {task.parentTaskId ? (
              <Card title="Parent task">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm text-slate-200/80">This task is a child of:</div>
                  <Link className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-100 hover:bg-white/10" href={`/tasks/${encodeURIComponent(task.parentTaskId)}`}>
                    Open parent {task.parentTaskId}
                  </Link>
                </div>
              </Card>
            ) : null}

            {!task.parentTaskId ? (
              <>
                <Card title="Child tasks (roll-up)">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-xs text-slate-200/70">Decompose work into child tasks and track progress here.</div>
                    <Link
                      className="rounded-xl border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-slate-100 hover:bg-white/10"
                      href={`/projects/${task.projectSlug}?parentTaskId=${encodeURIComponent(id)}#tasks-create`}
                    >
                      Create child task
                    </Link>
                  </div>

                <div className="mt-3 rounded-2xl border border-white/10 bg-white/5 p-3 text-xs text-slate-200/80">
                  {rollup ? (
                    <div className="flex flex-wrap gap-3">
                      <span><span className="text-slate-200/60">children</span> {rollup.total}</span>
                      <span><span className="text-slate-200/60">open</span> {rollup.open}</span>
                      <span><span className="text-slate-200/60">in progress/claimed</span> {rollup.inProgressOrClaimed}</span>
                      <span><span className="text-slate-200/60">completed</span> {rollup.completed}</span>
                      <span><span className="text-slate-200/60">deliverables accepted</span> {rollup.accepted}</span>
                      <span><span className="text-slate-200/60">under review</span> {rollup.submitted}</span>
                      <span><span className="text-slate-200/60">changes requested</span> {rollup.changesRequested}</span>
                    </div>
                  ) : (
                    <div className="text-slate-200/60">No roll-up yet.</div>
                  )}
                </div>

                <div className="mt-3 grid gap-2">
                  {children.map((c) => (
                    <Link key={c.id} href={`/tasks/${encodeURIComponent(c.id)}`} className="block rounded-2xl border border-white/10 bg-white/5 p-3 hover:bg-white/10">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="text-sm font-semibold text-slate-50">{c.title}</div>
                        <div className="text-xs text-slate-200/60">{c.status}</div>
                      </div>
                      <div className="mt-1 text-xs text-slate-200/60 font-mono">{c.id}</div>
                    </Link>
                  ))}
                  {children.length === 0 ? <div className="text-xs text-slate-200/60">No child tasks yet.</div> : null}
                </div>
              </Card>

              <Card title="Work results (child deliverables)">
                <div className="text-xs text-slate-200/70">Aggregated deliverables from child tasks. Deterministic view; no auto-generated parent summary.</div>

                <div className="mt-3 rounded-2xl border border-white/10 bg-white/5 p-3 text-xs text-slate-200/80">
                  {rollup ? (
                    <div className="flex flex-wrap gap-3">
                      <span>
                        <span className="text-slate-200/60">accepted</span> {rollup.accepted}
                      </span>
                      <span>
                        <span className="text-slate-200/60">under review</span> {rollup.submitted}
                      </span>
                      <span>
                        <span className="text-slate-200/60">changes requested</span> {rollup.changesRequested}
                      </span>
                      {typeof rollup.noDeliverableOrNotSubmitted === 'number' ? (
                        <span>
                          <span className="text-slate-200/60">no deliverable / not submitted</span> {rollup.noDeliverableOrNotSubmitted}
                        </span>
                      ) : null}
                    </div>
                  ) : (
                    <div className="text-slate-200/60">No aggregation yet.</div>
                  )}
                </div>

                <div className="mt-3 rounded-2xl border border-white/10 bg-black/20 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-xs font-semibold text-slate-200/70">Blockers</div>
                    <div className="text-xs text-slate-200/60">blocked children {children.filter((c) => (c as any).isBlocked).length}</div>
                  </div>

                  <div className="mt-2 grid gap-2">
                    {children
                      .filter((c) => (c as any).isBlocked)
                      .slice(0, 8)
                      .map((c) => (
                        <Link key={c.id} href={`/tasks/${encodeURIComponent(c.id)}`} className="block rounded-2xl border border-rose-400/20 bg-rose-400/10 p-3 hover:bg-rose-400/15">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="text-sm font-semibold text-slate-50">{c.title || c.id}</div>
                            <div className="text-xs text-slate-200/70">blocked</div>
                          </div>
                          <div className="mt-1 text-xs text-slate-200/70">
                            {(c as any).blockedReason ? <span><span className="text-slate-200/50">reason</span> {(c as any).blockedReason}</span> : <span className="text-slate-200/40">reason —</span>}
                            {(c as any).blockedByTaskId ? (
                              <span className="ml-2">
                                · <span className="text-slate-200/50">blocked by</span> <span className="font-mono">{(c as any).blockedByTaskId}</span>
                              </span>
                            ) : null}
                          </div>
                        </Link>
                      ))}

                    {children.filter((c) => (c as any).isBlocked).length === 0 ? (
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-xs text-slate-200/60">No blocked child tasks.</div>
                    ) : null}
                  </div>
                </div>

                {reviewSignals.submitted.length || reviewSignals.changesRequested.length ? (
                  <div className="mt-3 grid gap-2 rounded-2xl border border-white/10 bg-black/20 p-3">
                    <div className="text-xs font-semibold text-slate-200/70">Latest active review signals</div>
                    {reviewSignals.submitted.slice(0, 5).map(({ t, d }) => (
                      <Link key={t.id} href={`/tasks/${encodeURIComponent(t.id)}`} className="block rounded-2xl border border-sky-400/20 bg-sky-400/10 p-3 hover:bg-sky-400/15">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="text-sm font-semibold text-slate-50">{t.title || t.id}</div>
                          <div className="text-xs text-slate-200/70">submitted · @{d.authorHandle}</div>
                        </div>
                        <div className="mt-1 text-xs text-slate-200/60">{d.submittedAt ? `submitted ${fmtTs(d.submittedAt)}` : `updated ${fmtTs(d.updatedAt)}`}</div>
                      </Link>
                    ))}
                    {reviewSignals.changesRequested.slice(0, 5).map(({ t, d }) => (
                      <Link key={t.id} href={`/tasks/${encodeURIComponent(t.id)}`} className="block rounded-2xl border border-amber-400/20 bg-amber-400/10 p-3 hover:bg-amber-400/15">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="text-sm font-semibold text-slate-50">{t.title || t.id}</div>
                          <div className="text-xs text-slate-200/70">changes requested · @{d.authorHandle}</div>
                        </div>
                        <div className="mt-1 text-xs text-slate-200/60">{d.reviewedAt ? `reviewed ${fmtTs(d.reviewedAt)}` : `updated ${fmtTs(d.updatedAt)}`}</div>
                      </Link>
                    ))}
                  </div>
                ) : null}

                <div className="mt-3 grid gap-2">
                  {acceptedChildren.slice(0, 5).map(({ t, d }) => {
                    const md = String(d?.summaryMd || '').trim();
                    const snippet = md ? md.split('\n').slice(0, 6).join('\n') : '';
                    return (
                      <Link key={t.id} href={`/tasks/${encodeURIComponent(t.id)}`} className="block rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-3 hover:bg-emerald-400/15">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="text-sm font-semibold text-slate-50">{t.title || t.id}</div>
                          <div className="text-xs text-slate-200/70">accepted · @{d?.authorHandle}</div>
                        </div>
                        <div className="mt-1 text-xs text-slate-200/60">{(d?.reviewedAt || d?.updatedAt) ? `accepted ${fmtTs((d?.reviewedAt || d?.updatedAt) as string)}` : ''}</div>
                        {snippet ? <pre className="mt-2 whitespace-pre-wrap rounded-2xl border border-white/10 bg-black/20 p-3 text-[11px] leading-relaxed text-slate-100">{snippet}</pre> : null}
                      </Link>
                    );
                  })}

                  {acceptedChildren.length === 0 ? (
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-xs text-slate-200/60">No accepted child deliverables yet. When a child task deliverable is accepted, it will appear here.</div>
                  ) : null}
                </div>
              </Card>
            </>
            ) : null}

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

              <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-xs font-semibold text-slate-200/70">Blocker signal</div>
                  {task.isBlocked ? <Tag>blocked</Tag> : <Tag>not blocked</Tag>}
                </div>

                {task.isBlocked ? (
                  <div className="mt-2 grid gap-2 text-xs text-slate-200/70">
                    {task.blockedReason ? <div><span className="text-slate-200/50">reason</span> {task.blockedReason}</div> : <div className="text-slate-200/50">reason —</div>}
                    {task.blockedByTaskId ? (
                      <div>
                        <span className="text-slate-200/50">blocked by</span>{' '}
                        <Link className="underline decoration-white/30 hover:decoration-white/60" href={`/tasks/${encodeURIComponent(task.blockedByTaskId)}`}>
                          {task.blockedByTaskId}
                        </Link>
                      </div>
                    ) : (
                      <div className="text-slate-200/50">blocked by —</div>
                    )}
                  </div>
                ) : (
                  <div className="mt-2 text-xs text-slate-200/50">No blockers.</div>
                )}

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-100 hover:bg-white/10"
                    onClick={async () => {
                      const res = await fetch(`/api/tasks/${encodeURIComponent(id)}/block`, {
                        method: 'POST',
                        headers: { 'content-type': 'application/json' },
                        body: JSON.stringify({
                          isBlocked: true,
                          blockedReason: window.prompt('Blocked reason (optional):', task.blockedReason || '') || '',
                          blockedByTaskId: window.prompt('Blocked by task id (optional):', task.blockedByTaskId || '') || '',
                          actorHandle: (window as any).__A2A_ACTOR_HANDLE || ((window as any).localStorage?.getItem?.('a2a_site_actor') ? (() => { try { return JSON.parse((window as any).localStorage.getItem('a2a_site_actor')).handle; } catch { return 'local-human'; } })() : 'local-human'),
                          actorType: (window as any).__A2A_ACTOR_TYPE || ((window as any).localStorage?.getItem?.('a2a_site_actor') ? (() => { try { return JSON.parse((window as any).localStorage.getItem('a2a_site_actor')).actorType; } catch { return 'human'; } })() : 'human'),
                        }),
                      });
                      const j = (await res.json().catch(() => null)) as any;
                      if (j?.task) setTask(j.task);
                    }}
                  >
                    Mark blocked…
                  </button>

                  <button
                    type="button"
                    className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-100 hover:bg-white/10"
                    onClick={async () => {
                      const res = await fetch(`/api/tasks/${encodeURIComponent(id)}/block`, {
                        method: 'POST',
                        headers: { 'content-type': 'application/json' },
                        body: JSON.stringify({
                          isBlocked: false,
                          actorHandle:
                            (window as any).__A2A_ACTOR_HANDLE ||
                            ((window as any).localStorage?.getItem?.('a2a_site_actor')
                              ? (() => {
                                  try {
                                    return JSON.parse((window as any).localStorage.getItem('a2a_site_actor')).handle;
                                  } catch {
                                    return 'local-human';
                                  }
                                })()
                              : 'local-human'),
                          actorType:
                            (window as any).__A2A_ACTOR_TYPE ||
                            ((window as any).localStorage?.getItem?.('a2a_site_actor')
                              ? (() => {
                                  try {
                                    return JSON.parse((window as any).localStorage.getItem('a2a_site_actor')).actorType;
                                  } catch {
                                    return 'human';
                                  }
                                })()
                              : 'human'),
                        }),
                      });
                      const j = (await res.json().catch(() => null)) as any;
                      if (j?.task) setTask(j.task);
                    }}
                  >
                    Clear blocked
                  </button>
                </div>
              </div>

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
              <div
                className={`flex flex-wrap items-center justify-between gap-2 rounded-2xl border p-3 ${
                  deliverable?.status === 'accepted'
                    ? 'border-emerald-400/25 bg-emerald-400/10'
                    : deliverable?.status === 'changes_requested'
                      ? 'border-amber-400/25 bg-amber-400/10'
                      : deliverable?.status === 'submitted'
                        ? 'border-sky-400/25 bg-sky-400/10'
                        : 'border-white/10 bg-white/5'
                }`}
              >
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="text-slate-200/70">State</span>
                  <Tag>{deliverable?.status || 'none'}</Tag>
                  {(() => {
                    const c = parseChecklistCount(deliverable?.summaryMd || summaryMd || '');
                    if (!c.total) return null;
                    return <span className="text-slate-200/70">· Checklist {c.checked}/{c.total}</span>;
                  })()}
                  {deliverable?.reviewedAt ? <span className="text-slate-200/60">· reviewed {fmtTs(deliverable.reviewedAt)}</span> : null}
                  {deliverable?.submittedAt ? <span className="text-slate-200/60">· submitted {fmtTs(deliverable.submittedAt)}</span> : null}
                  {deliverable?.updatedAt ? <span className="text-slate-200/60">· edited {fmtTs(deliverable.updatedAt)}</span> : null}
                </div>

                <div className="text-[11px] text-slate-200/70">
                  {deliverable?.status === 'submitted'
                    ? 'Next: reviewer should accept or request changes.'
                    : deliverable?.status === 'changes_requested'
                      ? 'Next: worker should revise and re-submit.'
                      : deliverable?.status === 'accepted'
                        ? 'Accepted deliverable (task output is complete).'
                        : 'Draft deliverable (not yet submitted).'}
                </div>
              </div>

              {deliverable?.status === 'changes_requested' && deliverable.revisionNote ? (
                <div className="mt-3 rounded-2xl border border-amber-400/35 bg-amber-400/10 p-3 text-xs text-amber-100">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="font-semibold">Changes requested (why it was sent back)</div>
                    {deliverable?.reviewedAt ? <div className="text-[11px] text-amber-100/70">reviewed {fmtTs(deliverable.reviewedAt)}</div> : null}
                  </div>
                  <div className="mt-2 whitespace-pre-wrap text-amber-100/90">{deliverable.revisionNote}</div>
                  <div className="mt-2 text-[11px] text-amber-100/70">Next: update the deliverable content, then re-submit for review.</div>
                </div>
              ) : null}

              {deliverable?.status === 'submitted' ? (
                <div className="mt-3 rounded-2xl border border-sky-400/25 bg-sky-400/10 p-3 text-xs text-sky-100">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="font-semibold">Submitted for review</div>
                    {deliverable?.submittedAt ? <div className="text-[11px] text-sky-100/70">submitted {fmtTs(deliverable.submittedAt)}</div> : null}
                  </div>
                  <div className="mt-1">Next: reviewer should accept or request changes.</div>
                </div>
              ) : null}

              {deliverable?.status === 'accepted' ? (
                <div className="mt-3 rounded-2xl border border-emerald-400/25 bg-emerald-400/10 p-3 text-xs text-emerald-100">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="font-semibold">Accepted deliverable</div>
                    {deliverable?.reviewedAt ? <div className="text-[11px] text-emerald-100/70">accepted {fmtTs(deliverable.reviewedAt)}</div> : null}
                  </div>
                  <div className="mt-1">This task output is complete and accepted.</div>
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

                <div className="grid gap-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[11px] text-slate-200/60">Evidence links (formal artifacts)</span>
                    <span className="text-[11px] text-slate-200/50">Format: <span className="font-mono">label https://…</span> or <span className="font-mono">https://…</span></span>
                  </div>

                  {(deliverable?.evidenceLinks || []).length ? (
                    <div className="grid gap-2 rounded-2xl border border-white/10 bg-white/5 p-3">
                      {(deliverable?.evidenceLinks || []).map((l, idx) => (
                        <a
                          key={idx}
                          href={l.url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs text-slate-100 hover:bg-black/30"
                        >
                          <div className="min-w-0">
                            <div className="font-semibold text-slate-50">{l.label || 'Evidence'}</div>
                            <div className="truncate font-mono text-[11px] text-slate-200/60">{l.url}</div>
                          </div>
                          <div className="text-[11px] text-slate-200/50">open</div>
                        </a>
                      ))}
                    </div>
                  ) : null}

                  <textarea
                    className="min-h-[88px] w-full rounded-2xl border border-white/10 bg-black/20 p-3 text-sm text-slate-100 outline-none focus:border-white/20"
                    value={linksText}
                    onChange={(e) => setLinksText(e.target.value)}
                    placeholder="label https://...\nhttps://..."
                  />
                </div>

                <Card title="Attachments (optional)">
                  <div className="text-xs text-slate-200/70">Attach real files to this deliverable. Max 10MB each.</div>

                  <div className="mt-3 grid gap-2">
                    {attachments.map((a) => (
                      <a
                        key={a.id}
                        href={`/api/deliverables/attachments/${encodeURIComponent(a.id)}`}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-white/10 bg-white/5 p-3 text-xs text-slate-100 hover:bg-white/10"
                      >
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-50">{a.name}</div>
                          <div className="mt-1 truncate font-mono text-[11px] text-slate-200/60">{a.mimeType} · {Math.round((a.sizeBytes || 0) / 1024)} KB</div>
                        </div>
                        <div className="text-[11px] text-slate-200/60">download</div>
                      </a>
                    ))}
                    {attachments.length === 0 ? <div className="text-xs text-slate-200/60">No attachments yet.</div> : null}

                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <input
                        type="file"
                        onChange={(e) => {
                          const f = e.target.files && e.target.files[0] ? e.target.files[0] : null;
                          setUploadFile(f);
                        }}
                        className="text-xs text-slate-200/70"
                      />
                      <button
                        type="button"
                        disabled={!uploadFile || !deliverable}
                        className="rounded-xl bg-sky-700 px-3 py-2 text-xs text-white hover:bg-sky-600 disabled:opacity-40"
                        onClick={async () => {
                          if (!uploadFile || !deliverable) return;
                          setUploadMsg(null);
                          const fd = new FormData();
                          fd.set('file', uploadFile);
                          const url = `/api/tasks/${encodeURIComponent(id)}/deliverable/attachments?actorHandle=local-human&actorType=human`;
                          const res = await fetch(url, { method: 'POST', body: fd });
                          const j = await res.json().catch(() => null);
                          if (!res.ok || !j?.ok) {
                            setUploadMsg(j?.error || 'upload_failed');
                            return;
                          }
                          setUploadMsg('Uploaded.');
                          setUploadFile(null);
                          const rr = await fetch(`/api/tasks/${encodeURIComponent(id)}/deliverable/attachments`, { cache: 'no-store' });
                          const jj = await rr.json().catch(() => null);
                          setAttachments((jj?.attachments || []) as any[]);
                        }}
                      >
                        Upload
                      </button>
                      {uploadMsg ? <span className="text-xs text-slate-200/70">{uploadMsg}</span> : null}
                    </div>
                  </div>
                </Card>

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
                        body: JSON.stringify({ actorHandle: 'local-human', actorType: 'human', summaryMd, evidenceLinks }),
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
                        body: JSON.stringify({ actorHandle: 'local-human', actorType: 'human' }),
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
