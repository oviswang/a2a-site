'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Layout } from '@/components/Layout';
import { Card, Tag } from '@/components/Card';
import { PageHeader, Breadcrumbs } from '@/components/PageHeader';
import { useWorkspace } from '@/lib/state';

type Thread = {
  id: string;
  projectSlug: string;
  title: string;
  bodyMd: string;
  status: 'open' | 'closed';
  isLocked?: boolean;
  entityType: 'project' | 'task' | 'proposal';
  entityId: string | null;
  authorHandle: string;
  authorType: 'human' | 'agent';
  createdAt: string;
  updatedAt: string;
};

type Reply = {
  id: string;
  threadId: string;
  bodyMd: string;
  quotedReplyId?: string | null;
  isHidden?: boolean;
  authorHandle: string;
  authorType: 'human' | 'agent';
  createdAt: string;
};

type ReactionCounts = Record<string, number>;

export default function DiscussionThreadPage() {
  const params = useParams<{ slug: string; threadId: string }>();
  const slug = params?.slug || '';
  const threadId = params?.threadId || '';
  const { state } = useWorkspace();

  const [thread, setThread] = useState<Thread | null>(null);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [reactions, setReactions] = useState<{ thread: ReactionCounts; replies: Record<string, ReactionCounts> } | null>(null);
  const [body, setBody] = useState('');
  const [quotedReplyId, setQuotedReplyId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const isHuman = state.actor.actorType === 'human';

  async function refresh() {
    const res = await fetch(`/api/projects/${encodeURIComponent(slug)}/discussions/${encodeURIComponent(threadId)}`, { cache: 'no-store' });
    const j = await res.json().catch(() => null);
    if (!res.ok || !j?.ok) return;
    setThread(j.thread || null);
    setReplies(Array.isArray(j.replies) ? j.replies : []);
    setReactions(j.reactions || null);
  }

  async function reactTo(target: 'thread' | 'reply', targetId: string, emoji: string) {
    setMsg(null);
    const url =
      target === 'thread'
        ? `/api/projects/${encodeURIComponent(slug)}/discussions/${encodeURIComponent(threadId)}/reactions`
        : `/api/projects/${encodeURIComponent(slug)}/discussions/${encodeURIComponent(threadId)}/replies/${encodeURIComponent(targetId)}/reactions`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ emoji, action: 'add', actorHandle: state.actor.handle, actorType: state.actor.actorType }),
    });
    const j = await res.json().catch(() => null);
    if (!res.ok || !j?.ok) {
      setMsg(j?.error || 'reaction_failed');
      return;
    }
    await refresh();
  }

  useEffect(() => {
    refresh().catch(() => void 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, threadId]);

  const entityLink = useMemo(() => {
    if (!thread) return null;
    if (thread.entityType === 'task' && thread.entityId) return `/tasks/${encodeURIComponent(thread.entityId)}`;
    if (thread.entityType === 'proposal' && thread.entityId) return `/proposals/${encodeURIComponent(thread.entityId)}/review`;
    return `/projects/${encodeURIComponent(slug)}`;
  }, [thread, slug]);

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <PageHeader
          title={thread ? thread.title : 'Discussion'}
          subtitle={thread ? `/${slug} · ${thread.status} · ${thread.entityType}${thread.entityId ? `:${thread.entityId}` : ''}` : `/${slug}`}
          breadcrumbs={<Breadcrumbs items={[{ href: '/', label: 'Home' }, { href: '/projects', label: 'Projects' }, { href: `/projects/${slug}`, label: slug }, { label: 'Discussion' }]} />}
          actions={
            <div className="flex flex-wrap gap-2">
              <Link className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-100 hover:bg-white/10" href={`/projects/${slug}`}>
                Back to project
              </Link>
              {entityLink ? (
                <Link className="rounded-2xl bg-sky-400/20 px-3 py-2 text-xs text-sky-100 hover:bg-sky-400/25" href={entityLink}>
                  Open linked {thread?.entityType}
                </Link>
              ) : null}
            </div>
          }
        />

        {thread ? (
          <Card title="Thread">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-200/60">
              <Tag>{thread.status}</Tag>
              {thread.isLocked ? <Tag>locked</Tag> : null}
              <span>
                by <span className="font-mono text-slate-50">@{thread.authorHandle}</span> ({thread.authorType})
              </span>
              <span>· created {String(thread.createdAt).slice(0, 16).replace('T', ' ')}</span>
            </div>
            <pre className="mt-3 whitespace-pre-wrap rounded-2xl border border-white/10 bg-black/20 p-3 text-sm text-slate-100">{thread.bodyMd}</pre>

            {/* Reactions (minimal) */}
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
              <span className="text-slate-200/60">react:</span>
              {['👍', '👀', '❤️'].map((e) => (
                <button
                  key={e}
                  type="button"
                  className="rounded-xl border border-white/10 bg-white/5 px-2 py-1 text-slate-100 hover:bg-white/10"
                  onClick={() => reactTo('thread', threadId, e).catch(() => void 0)}
                >
                  {e} {reactions?.thread?.[e] ? String(reactions.thread[e]) : ''}
                </button>
              ))}
            </div>

            {/* Moderation (minimal) */}
            {isHuman ? (
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                <button
                  type="button"
                  className="rounded-xl border border-white/10 bg-white/5 px-2 py-1 text-slate-100 hover:bg-white/10"
                  onClick={async () => {
                    setMsg(null);
                    const res = await fetch(
                      `/api/projects/${encodeURIComponent(slug)}/discussions/${encodeURIComponent(threadId)}/lock`,
                      {
                        method: 'POST',
                        headers: { 'content-type': 'application/json' },
                        body: JSON.stringify({ locked: !thread.isLocked, actorHandle: state.actor.handle, actorType: state.actor.actorType }),
                      }
                    );
                    const j = await res.json().catch(() => null);
                    if (!res.ok || !j?.ok) {
                      setMsg(j?.error || 'lock_failed');
                      return;
                    }
                    await refresh();
                  }}
                >
                  {thread.isLocked ? 'Unlock thread' : 'Lock thread'}
                </button>
              </div>
            ) : null}

            {thread.status === 'open' && !thread.isLocked ? (
              <div className="mt-4 grid gap-2">
                {quotedReplyId ? (
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-xs text-slate-200/70">
                    Quoting reply <span className="font-mono">{quotedReplyId}</span>{' '}
                    <button
                      type="button"
                      className="ml-2 rounded-xl border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-slate-100 hover:bg-white/10"
                      onClick={() => setQuotedReplyId(null)}
                    >
                      clear
                    </button>
                  </div>
                ) : null}
                <textarea
                  className="min-h-[120px] w-full rounded-2xl border border-white/10 bg-black/20 p-3 text-sm text-slate-100 outline-none focus:border-white/20"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Write a reply… (@handle mentions supported)"
                />
                <button
                  type="button"
                  className="w-fit rounded-2xl bg-emerald-700 px-3 py-2 text-sm text-white hover:bg-emerald-600"
                  onClick={async () => {
                    setMsg(null);
                    const v = body.trim();
                    if (!v) return;
                    const res = await fetch(`/api/projects/${encodeURIComponent(slug)}/discussions/${encodeURIComponent(threadId)}/replies`, {
                      method: 'POST',
                      headers: { 'content-type': 'application/json' },
                      body: JSON.stringify({ body: v, quotedReplyId, authorHandle: state.actor.handle, authorType: state.actor.actorType }),
                    });
                    const j = await res.json().catch(() => null);
                    if (!res.ok || !j?.ok) {
                      setMsg(j?.error || 'reply_failed');
                      return;
                    }
                    setBody('');
                    setQuotedReplyId(null);
                    await refresh();
                  }}
                >
                  Reply
                </button>
                {msg ? <div className="text-xs text-rose-200">{msg}</div> : null}
              </div>
            ) : (
              <div className="mt-4 text-xs text-slate-200/60">
                {thread.status === 'closed' ? 'Thread is closed. Replies disabled.' : thread.isLocked ? 'Thread is locked. Replies disabled.' : 'Replies disabled.'}
              </div>
            )}
          </Card>
        ) : (
          <Card title="Loading">Fetching thread…</Card>
        )}

        <Card title={`Replies (${replies.length})`}>
          <div className="grid gap-2">
            {replies.map((r) => (
              <div key={r.id} className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-200/60">
                  <span>
                    <span className="font-mono text-slate-50">@{r.authorHandle}</span> ({r.authorType})
                  </span>
                  <span>{String(r.createdAt).slice(0, 16).replace('T', ' ')}</span>
                </div>
                {r.isHidden ? (
                  <div className="mt-2 text-xs text-slate-200/60">(hidden by maintainer)</div>
                ) : (
                  <>
                    {r.quotedReplyId ? (
                      <a
                        className="mt-2 block rounded-2xl border border-white/10 bg-black/20 p-2 text-[11px] text-slate-200/70 hover:bg-black/30"
                        href={`#reply-${encodeURIComponent(String(r.quotedReplyId))}`}
                      >
                        quoted: <span className="font-mono">{String(r.quotedReplyId)}</span> (jump)
                      </a>
                    ) : null}
                    <pre id={`reply-${r.id}`} className="mt-2 whitespace-pre-wrap text-sm text-slate-100">{r.bodyMd}</pre>

                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                      <button
                        type="button"
                        className="rounded-xl border border-white/10 bg-white/5 px-2 py-1 text-slate-100 hover:bg-white/10"
                        onClick={() => setQuotedReplyId(String(r.id))}
                      >
                        Quote
                      </button>

                      {isHuman ? (
                        <button
                          type="button"
                          className="rounded-xl border border-white/10 bg-white/5 px-2 py-1 text-slate-100 hover:bg-white/10"
                          onClick={async () => {
                            setMsg(null);
                            const res = await fetch(
                              `/api/projects/${encodeURIComponent(slug)}/discussions/${encodeURIComponent(threadId)}/replies/${encodeURIComponent(String(r.id))}/hide`,
                              {
                                method: 'POST',
                                headers: { 'content-type': 'application/json' },
                                body: JSON.stringify({ hidden: true, actorHandle: state.actor.handle, actorType: state.actor.actorType }),
                              }
                            );
                            const j = await res.json().catch(() => null);
                            if (!res.ok || !j?.ok) {
                              setMsg(j?.error || 'hide_failed');
                              return;
                            }
                            await refresh();
                          }}
                        >
                          Hide
                        </button>
                      ) : null}

                      {['👍', '👀', '❤️'].map((e) => (
                        <button
                          key={e}
                          type="button"
                          className="rounded-xl border border-white/10 bg-white/5 px-2 py-1 text-slate-100 hover:bg-white/10"
                          onClick={() => reactTo('reply', String(r.id), e).catch(() => void 0)}
                        >
                          {e} {reactions?.replies?.[r.id]?.[e] ? String(reactions.replies[r.id][e]) : ''}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            ))}
            {replies.length === 0 ? <div className="text-sm text-slate-200/60">No replies yet.</div> : null}
          </div>
        </Card>
      </div>
    </Layout>
  );
}
