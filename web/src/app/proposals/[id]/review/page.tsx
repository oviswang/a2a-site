'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Layout } from '@/components/Layout';
import { Card, Tag } from '@/components/Card';
import { PageHeader, Breadcrumbs } from '@/components/PageHeader';
import { StatusBadge } from '@/components/Status';
import { Button, Textarea } from '@/components/ui';
import { useWorkspace, type WorkspaceProposal } from '@/lib/state';

type ReviewEvent = {
  action: string;
  actorHandle: string | null;
  actorType: 'human' | 'agent' | null;
  note: string | null;
  createdAt: string;
};

export default function ProposalReviewPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id || '';
  const router = useRouter();

  const { state, actions } = useWorkspace();
  const [pr, setPr] = useState<WorkspaceProposal | null>(null);
  const [reviews, setReviews] = useState<ReviewEvent[]>([]);

  const [note, setNote] = useState('');
  const [comment, setComment] = useState('');

  const [editSummary, setEditSummary] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editNote, setEditNote] = useState('');

  const [showAllTimeline, setShowAllTimeline] = useState(false);
  const [showFullContent, setShowFullContent] = useState(false);

  // Discussions (v1) — link-out widget
  const [discThreads, setDiscThreads] = useState<any[]>([]);

  async function refresh() {
    const res = await fetch(`/api/proposals/${encodeURIComponent(id)}`, { cache: 'no-store' });
    if (!res.ok) return;
    const j = (await res.json()) as { proposal: WorkspaceProposal; reviews?: ReviewEvent[] };
    setPr(j.proposal);
    setReviews(j.reviews || []);

    if (!editContent) {
      setEditSummary(j.proposal.summary || '');
      setEditContent(j.proposal.newContent || '');
    }

    // best-effort: load discussions linked to this proposal
    if (j?.proposal?.projectSlug && j?.proposal?.id) {
      fetch(`/api/projects/${encodeURIComponent(j.proposal.projectSlug)}/discussions?entityType=proposal&entityId=${encodeURIComponent(j.proposal.id)}&limit=10`, { cache: 'no-store' })
        .then((r) => (r.ok ? r.json() : null))
        .then((jj) => setDiscThreads(Array.isArray(jj?.threads) ? jj.threads : []))
        .catch(() => void 0);
    }
  }

  useEffect(() => {
    refresh().catch(() => void 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const project = pr ? state.projects.find((p) => p.slug === pr.projectSlug) || null : null;
  const canMerge = useMemo(() => pr && pr.status === 'approved', [pr]);
  const locked = useMemo(() => pr && (pr.status === 'merged' || pr.status === 'rejected'), [pr]);
  const isAuthor = useMemo(() => pr && state.actor.handle === pr.authorHandle, [pr, state.actor.handle]);

  const timeline = useMemo(() => {
    const list = reviews;
    return showAllTimeline ? list : list.slice(Math.max(0, list.length - 25));
  }, [reviews, showAllTimeline]);

  const contentPreview = useMemo(() => {
    const raw = pr?.newContent || '';
    const lines = raw.split(/\r?\n/);
    if (showFullContent) return raw;
    return lines.slice(0, 40).join('\n') + (lines.length > 40 ? '\n\n… (collapsed)' : '');
  }, [pr?.newContent, showFullContent]);

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <PageHeader
          title={pr ? pr.title : 'Proposal'}
          subtitle={pr && project ? `/${project.slug} · ${pr.status} · ${pr.filePath}` : `ID: ${id}`}
          breadcrumbs={
            <Breadcrumbs
              items={[
                { href: '/', label: 'Home' },
                { href: '/projects', label: 'Projects' },
                { href: project ? `/projects/${project.slug}` : undefined, label: project?.slug || pr?.projectSlug || 'project' },
                { label: pr ? pr.id : id },
              ]}
            />
          }
        />

        {pr ? (
          <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
            <div className="flex flex-col gap-6">
              <Card title="Discussion (linked)">
                <div className="text-xs text-slate-200/70">Context threads for this proposal (project-scoped).</div>
                <div className="mt-3 grid gap-2">
                  {discThreads.slice(0, 5).map((t) => (
                    <a
                      key={t.id}
                      href={`/projects/${encodeURIComponent(String(pr.projectSlug))}/discussions/${encodeURIComponent(String(t.id))}`}
                      className="block rounded-2xl border border-white/10 bg-white/5 p-3 hover:bg-white/10"
                    >
                      <div className="text-sm font-semibold text-slate-50">{String(t.title || t.id)}</div>
                      <div className="mt-1 text-xs text-slate-200/60">{String(t.status || 'open')} · replies {Number(t.replyCount || 0)}</div>
                    </a>
                  ))}
                  {discThreads.length === 0 ? <div className="text-xs text-slate-200/60">No linked discussions yet (start one from the project page).</div> : null}
                </div>
                <div className="mt-3">
                  <a className="text-xs text-sky-200 hover:text-sky-100" href={`/projects/${encodeURIComponent(String(pr.projectSlug))}#discussions`}>
                    Open project discussions
                  </a>
                </div>
              </Card>

              <Card title="Proposed change">
                <div className="grid gap-2">
                  <div className="text-sm text-slate-200/80">{pr.summary}</div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-200/60">
                    <Tag>{pr.filePath}</Tag>
                    <span>
                      author <span className="font-mono">@{pr.authorHandle}</span> ({pr.authorType})
                    </span>
                    {pr.taskId ? (
                      <span>
                        · task{' '}
                        <Link className="font-mono underline decoration-white/30 hover:decoration-white/60" href={`/tasks/${encodeURIComponent(pr.taskId)}`}>
                          {pr.taskId}
                        </Link>
                      </span>
                    ) : null}
                  </div>
                </div>
              </Card>

              <Card
                title="New content"
                footer={
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-xs text-slate-200/60">
                      {showFullContent ? 'showing full content' : 'showing preview'}
                    </div>
                    <Button type="button" size="sm" onClick={() => setShowFullContent((s) => !s)}>
                      {showFullContent ? 'Collapse' : 'Expand'}
                    </Button>
                  </div>
                }
              >
                <pre className="whitespace-pre-wrap rounded-2xl border border-white/10 bg-black/20 p-3 font-mono text-xs leading-relaxed text-slate-100">
                  {contentPreview}
                </pre>
              </Card>

              <Card title="Review timeline">
                <div className="flex flex-wrap items-end justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 p-3">
                  <div className="text-xs text-slate-200/60">{timeline.length} shown · {reviews.length} total</div>
                  <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-2 py-1 text-xs text-slate-100">
                    <input type="checkbox" checked={showAllTimeline} onChange={(e) => setShowAllTimeline(e.target.checked)} />
                    show all
                  </label>
                </div>

                <div className="mt-3 flex flex-col gap-2">
                  {timeline.map((r, idx) => (
                    <div key={idx} className="rounded-2xl border border-white/10 bg-white/5 p-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-[11px] text-slate-200/50">{String(r.createdAt).slice(0, 16).replace('T', ' ')}</span>
                          <Tag>{r.action}</Tag>
                          <span className="text-[11px] text-slate-200/60">
                            {r.actorHandle ? `@${r.actorHandle}` : 'system'} {r.actorType ? `(${r.actorType})` : ''}
                          </span>
                        </div>
                      </div>
                      {r.note ? <div className="mt-1 text-xs text-slate-200/80">{r.note}</div> : null}
                    </div>
                  ))}
                  {reviews.length === 0 ? <div className="text-sm text-slate-200/60">No review events yet</div> : null}
                </div>

                <div className="mt-4 grid gap-2">
                  <Textarea
                    className="rounded-xl"
                    rows={3}
                    placeholder="Add a comment…"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                  />
                  <Button
                    type="button"
                    variant="primary"
                    className="w-fit"
                    onClick={async () => {
                      if (!comment.trim()) return;
                      await actions.proposalAction(pr.id, 'comment', comment.trim());
                      setComment('');
                      await refresh();
                    }}
                  >
                    Post comment
                  </Button>
                </div>
              </Card>

              {isAuthor && pr.status === 'changes_requested' ? (
                <Card title="Author response">
                  <div className="text-xs text-slate-200/60">Edit + resubmit to return to needs_review.</div>
                  <div className="mt-3 grid gap-2">
                    <label className="grid gap-1">
                      <span className="text-xs font-semibold text-slate-200/70">Summary</span>
                      <textarea
                        className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100"
                        rows={2}
                        value={editSummary}
                        onChange={(e) => setEditSummary(e.target.value)}
                      />
                    </label>
                    <label className="grid gap-1">
                      <span className="text-xs font-semibold text-slate-200/70">Updated content</span>
                      <textarea
                        className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 font-mono text-xs text-slate-100"
                        rows={12}
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                      />
                    </label>
                    <label className="grid gap-1">
                      <span className="text-xs font-semibold text-slate-200/70">Note (optional)</span>
                      <input
                        className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100"
                        value={editNote}
                        onChange={(e) => setEditNote(e.target.value)}
                        placeholder="what changed"
                      />
                    </label>
                    <button
                      type="button"
                      className="w-fit rounded-2xl bg-emerald-700 px-3 py-2 text-sm text-white hover:bg-emerald-600"
                      onClick={async () => {
                        const res = await fetch(`/api/proposals/${encodeURIComponent(pr.id)}/update`, {
                          method: 'POST',
                          headers: { 'content-type': 'application/json' },
                          body: JSON.stringify({
                            actorHandle: state.actor.handle,
                            actorType: state.actor.actorType,
                            newContent: editContent,
                            summary: editSummary,
                            note: editNote || null,
                          }),
                        });
                        if (!res.ok) return;
                        setEditNote('');
                        await refresh();
                      }}
                    >
                      Resubmit
                    </button>
                  </div>
                </Card>
              ) : null}
            </div>

            <aside className="flex flex-col gap-4">
              <Card title="Status">
                <div className="flex flex-col gap-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-200/60">Status</span>
                    <StatusBadge status={pr.status} />
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-200/70">
                    <span>
                      author <span className="font-mono">@{pr.authorHandle}</span> ({pr.authorType})
                    </span>
                    <span className="text-slate-200/50">
                      {String(pr.createdAt).slice(0, 10)}
                      {pr.updatedAt ? ` → ${String(pr.updatedAt).slice(0, 10)}` : ''}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-200/60">Reviewer (acting)</span>
                    <span className="font-mono text-xs">
                      @{state.actor.handle} <span className="text-slate-200/60">({state.actor.actorType})</span>
                    </span>
                  </div>
                </div>
              </Card>

              <Card title="Formal decision">
                <div className="text-xs text-slate-200/70">Use proposal actions for formal decisions (approve/request changes/reject/merge/comment). Discussion is context, not approval.</div>
                <div className="mt-2 rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-100">
                  Tip: If you need coordination, reply in the linked discussion thread. Record the decision here.
                </div>
              </Card>

              <Card title="Review actions">
                {locked ? <div className="mb-3 text-xs text-slate-200/60">Closed proposal. Actions disabled.</div> : null}
                <Textarea
                  className="rounded-xl"
                  rows={3}
                  placeholder="Review note (optional)…"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
                <div className="mt-3 grid gap-2">
                  <div className="flex flex-wrap gap-2">
                    <Button
                      disabled={!!locked}
                      variant="success"
                      size="sm"
                      type="button"
                      onClick={async () => {
                        await actions.proposalAction(pr.id, 'approve', note.trim() || undefined);
                        setNote('');
                        await refresh();
                      }}
                    >
                      Approve
                    </Button>
                    <Button
                      disabled={!!locked}
                      variant="default"
                      size="sm"
                      type="button"
                      onClick={async () => {
                        await actions.proposalAction(pr.id, 'request_changes', note.trim() || undefined);
                        setNote('');
                        await refresh();
                      }}
                    >
                      Request changes…
                    </Button>
                    <Button
                      disabled={!!locked}
                      variant="danger"
                      size="sm"
                      type="button"
                      onClick={async () => {
                        await actions.proposalAction(pr.id, 'reject', note.trim() || undefined);
                        setNote('');
                        await refresh();
                      }}
                    >
                      Reject
                    </Button>
                  </div>

                  <Button
                    disabled={!canMerge}
                    variant="primary"
                    type="button"
                    onClick={async () => {
                      await actions.proposalAction(pr.id, 'merge', note.trim() || undefined);
                      setNote('');
                      router.push(`/projects/${pr.projectSlug}?file=${encodeURIComponent(pr.filePath)}`);
                    }}
                  >
                    Merge
                  </Button>
                  <div className="text-xs text-slate-200/60">Merge enabled only after approval.</div>
                </div>
              </Card>
            </aside>
          </div>
        ) : (
          <Card title="Loading">Fetching proposal…</Card>
        )}
      </div>
    </Layout>
  );
}
