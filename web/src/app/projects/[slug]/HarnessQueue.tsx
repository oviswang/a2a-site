'use client';

import Link from 'next/link';
import { Card } from '@/components/Card';

type Lane = 'execution' | 'coordination' | 'governance';

type AttentionItem = {
  type?: string;
  id?: string;
  ts?: string;
  title?: string;
  status?: string;
  webUrl?: string;

  // Level-3 coordination signals (may or may not exist depending on backend)
  nextSuggestedAction?: string;
  suggestedRole?: string;
  roleHint?: string;
  assignmentHint?: string;
  contentionLevel?: string;
  activeIntentCount?: number;
  intentMarkers?: string[];
  formalDecisionRequired?: boolean;
};

function laneForItem(it: AttentionItem): Lane {
  // Fixed priority: governance > coordination > execution.
  // Goal: stable + explainable; based only on existing fields.

  const type = String(it.type || '').toLowerCase();
  const status = String(it.status || '').toLowerCase();
  const action = String(it.nextSuggestedAction || '').toLowerCase();
  const assignmentHint = String(it.assignmentHint || '').toLowerCase();
  const contention = String(it.contentionLevel || '').toLowerCase();
  const intents = Number(it.activeIntentCount || 0);
  const markers = Array.isArray(it.intentMarkers) ? it.intentMarkers : [];

  // --- governance ---
  if (it.formalDecisionRequired) return 'governance';
  if (type === 'proposal' && (status === 'needs_review' || action.includes('review'))) return 'governance';
  if (type === 'deliverable' && action.includes('review')) return 'governance';
  if (action.includes('approve') || action.includes('request_changes') || action.includes('reject')) return 'governance';

  // --- coordination ---
  if (contention === 'active' || contention === 'high') return 'coordination';
  if (assignmentHint.includes('avoid') || assignmentHint.includes('reuse') || assignmentHint.includes('switch') || assignmentHint.includes('wait')) return 'coordination';
  if (intents > 0) return 'coordination';
  if (markers.length) return 'coordination';
  if (status.includes('blocked')) return 'coordination';

  // --- execution ---
  return 'execution';
}

function whyLane(it: AttentionItem, lane: Lane): string[] {
  const out: string[] = [];
  const type = String(it.type || '').toLowerCase();
  const status = String(it.status || '').toLowerCase();
  const action = String(it.nextSuggestedAction || '').toLowerCase();
  const assignmentHint = String(it.assignmentHint || '');
  const contention = String(it.contentionLevel || '');
  const intents = Number(it.activeIntentCount || 0);
  const markers = Array.isArray(it.intentMarkers) ? it.intentMarkers : [];

  if (lane === 'governance') {
    if (type === 'proposal') out.push('proposal review');
    if (type === 'deliverable') out.push('deliverable review');
    if (status === 'needs_review') out.push('status=needs_review');
    if (action) out.push(`next=${it.nextSuggestedAction}`);
    if (it.formalDecisionRequired) out.push('formal decision required');
    return out;
  }

  if (lane === 'coordination') {
    if (contention) out.push(`contention=${contention}`);
    if (assignmentHint) out.push(`hint=${assignmentHint}`);
    if (intents) out.push(`activeIntents=${intents}`);
    if (markers.length) out.push(`markers=${markers.slice(0, 3).join(',')}${markers.length > 3 ? '…' : ''}`);
    if (status.includes('blocked')) out.push('blocked');
    if (!out.length && action) out.push(`next=${it.nextSuggestedAction}`);
    return out;
  }

  // execution
  if (action) out.push(`next=${it.nextSuggestedAction}`);
  if (it.suggestedRole) out.push(`role=${it.suggestedRole}`);
  if (!out.length) out.push('no coordination/governance signals');
  return out;
}

function ItemRow({ it, lane }: { it: AttentionItem; lane: Lane }) {
  const title = it.title || it.id || 'Untitled';
  const href = it.webUrl || '';
  const meta = [it.type, it.status].filter(Boolean).join(' · ');

  const reasons = whyLane(it, lane);

  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-slate-50">
            {href ? (
              <Link className="hover:underline" href={href}>
                {title}
              </Link>
            ) : (
              title
            )}
          </div>
          <div className="mt-0.5 text-[11px] text-slate-200/60">{meta || '—'}</div>
        </div>

        {href ? (
          <div className="shrink-0">
            <Link className="rounded-xl border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-slate-100 hover:bg-white/10" href={href}>
              open
            </Link>
          </div>
        ) : null}
      </div>

      <div className="mt-2 grid gap-1 text-[11px] text-slate-200/70">
        <div>
          <span className="text-slate-200/50">why</span> {reasons.join(' · ')}
        </div>
        <div className="grid gap-0.5">
          {it.nextSuggestedAction ? (
            <div>
              <span className="text-slate-200/50">nextSuggestedAction</span> <span className="font-mono text-slate-100">{it.nextSuggestedAction}</span>
            </div>
          ) : null}
          {it.suggestedRole ? (
            <div>
              <span className="text-slate-200/50">suggestedRole</span> <span className="font-mono text-slate-100">{it.suggestedRole}</span>
            </div>
          ) : null}
          {it.assignmentHint ? (
            <div>
              <span className="text-slate-200/50">assignmentHint</span> <span className="font-mono text-slate-100">{it.assignmentHint}</span>
            </div>
          ) : null}
          {it.contentionLevel ? (
            <div>
              <span className="text-slate-200/50">contentionLevel</span> <span className="font-mono text-slate-100">{it.contentionLevel}</span>
            </div>
          ) : null}
          {typeof it.activeIntentCount === 'number' ? (
            <div>
              <span className="text-slate-200/50">activeIntentCount</span> <span className="font-mono text-slate-100">{String(it.activeIntentCount)}</span>
            </div>
          ) : null}
          {Array.isArray(it.intentMarkers) && it.intentMarkers.length ? (
            <div>
              <span className="text-slate-200/50">intentMarkers</span> <span className="font-mono text-slate-100">{it.intentMarkers.slice(0, 8).join(', ')}</span>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function LaneSection({ lane, title, subtitle, items }: { lane: Lane; title: string; subtitle: string; items: AttentionItem[] }) {
  const badgeClass =
    lane === 'execution'
      ? 'bg-emerald-500/15 text-emerald-100'
      : lane === 'coordination'
        ? 'bg-amber-500/15 text-amber-100'
        : 'bg-rose-500/15 text-rose-100';

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full border border-white/10 px-2 py-0.5 text-xs ${badgeClass}`}>{title}</span>
          <span className="text-xs text-slate-200/60">{subtitle}</span>
        </div>
        <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-slate-100">{items.length}</span>
      </div>

      {items.length ? (
        <div className="grid gap-2">
          {items.map((it, idx) => (
            <ItemRow key={`${lane}:${String(it.type)}:${String(it.id)}:${idx}`} it={it} lane={lane} />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-xs text-slate-200/60">No items.</div>
      )}
    </div>
  );
}

export function HarnessQueue({ attentionSummary }: { attentionSummary: any }) {
  const items: AttentionItem[] = Array.isArray(attentionSummary?.items) ? attentionSummary.items : [];

  const withLane = items
    .map((it) => ({ it, lane: laneForItem(it) }))
    .sort((a, b) => {
      // stable priority ordering inside the harness surface
      const prio: Record<Lane, number> = { governance: 0, coordination: 1, execution: 2 };
      const pa = prio[a.lane];
      const pb = prio[b.lane];
      if (pa !== pb) return pa - pb;
      return String(b.it.ts || '').localeCompare(String(a.it.ts || ''));
    });

  const execItems = withLane.filter((x) => x.lane === 'execution').map((x) => x.it);
  const coordItems = withLane.filter((x) => x.lane === 'coordination').map((x) => x.it);
  const govItems = withLane.filter((x) => x.lane === 'governance').map((x) => x.it);

  return (
    <Card title="Harness Queue (execution · coordination · governance)">
      <div className="text-xs text-slate-200/70">
        Queue is not a task list. It is the harness surface: what can be executed now, what needs coordination, and what requires formal governance.
      </div>

      <div className="mt-3 grid gap-5">
        <LaneSection lane="execution" title="Execution" subtitle="directly push work forward" items={execItems} />
        <LaneSection lane="coordination" title="Coordination" subtitle="avoid, reuse, switch, wait" items={coordItems} />
        <LaneSection lane="governance" title="Governance" subtitle="review, approve, formal decision" items={govItems} />
      </div>
    </Card>
  );
}

