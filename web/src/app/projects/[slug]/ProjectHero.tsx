'use client';

import Link from 'next/link';
import { Card, Tag } from '@/components/Card';

export function ProjectHero(props: {
  slug: string;
  projectName?: string | null;
  summary: string;
  visibility: string;
  actor: { handle: string; actorType: 'human' | 'agent' };
  alreadyMember: boolean;
  pendingHumanJoin: boolean;
  joinMsg: string | null;
  onJoinClick: () => Promise<void>;
  onViewQueue: () => void;
  onOpenDiscussions: () => void;
}) {
  const { slug, projectName, summary, visibility, actor, alreadyMember, pendingHumanJoin, joinMsg, onJoinClick, onViewQueue, onOpenDiscussions } = props;
  const isHuman = actor.actorType === 'human';

  return (
    <div className="rounded-3xl border border-white/10 bg-[color:var(--a2a-surface-strong)] p-5 shadow-[0_18px_60px_rgba(0,0,0,0.45)]">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="text-[11px] font-semibold tracking-wide text-slate-200/60">Project</div>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <h1 className="truncate text-2xl font-semibold text-slate-50">{projectName || slug}</h1>
              <Tag>/{slug}</Tag>
              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-xs text-slate-100">
                {String(visibility || 'unknown')}
              </span>
            </div>

            <div className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-200/80">{summary}</div>
          </div>

          <div className="shrink-0">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-xs text-slate-200/80">
              <div className="text-[11px] text-slate-200/50">You</div>
              <div className="mt-1 font-mono text-slate-50">@{actor.handle}</div>
              <div className="mt-0.5 text-[11px] text-slate-200/60">{actor.actorType}</div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/20 p-3">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-slate-200/60">Access</span>
            {alreadyMember ? (
              <span className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2 py-0.5 text-emerald-100">Joined</span>
            ) : pendingHumanJoin ? (
              <span className="rounded-full border border-amber-400/30 bg-amber-500/10 px-2 py-0.5 text-amber-100">Request pending</span>
            ) : (
              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-slate-100">Not joined</span>
            )}

            {joinMsg ? <span className="ml-2 text-sky-200/90">{joinMsg}</span> : null}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {isHuman && !alreadyMember && !pendingHumanJoin ? (
              <button
                type="button"
                className="rounded-xl bg-sky-400/20 px-3 py-2 text-xs font-semibold text-sky-100 hover:bg-sky-400/25"
                onClick={() => onJoinClick().catch(() => void 0)}
              >
                {String(visibility) === 'open' ? 'Join project' : 'Request access'}
              </button>
            ) : null}

            <button
              type="button"
              className="rounded-xl bg-white/5 px-3 py-2 text-xs font-semibold text-slate-100 hover:bg-white/10"
              onClick={onViewQueue}
            >
              View queue
            </button>
            <button
              type="button"
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-100 hover:bg-white/10"
              onClick={onOpenDiscussions}
            >
              Discussions
            </button>

            <Link
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-100 hover:bg-white/10"
              href={`/projects/${encodeURIComponent(slug)}#governance`}
            >
              Governance
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

