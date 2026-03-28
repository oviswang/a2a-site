import { searchAll } from './repo.ts';

export type SearchFirstRecommendation = {
  ok: true;
  query: string;
  resultCount: number;
  recommended: Array<{ slug: string; name: string; summary: string; visibility?: 'open' | 'restricted'; why: string }>;
  createAllowed: boolean;
  createReason: 'no_results' | 'low_relevance' | null;
};

// MVP: deterministic query builder (no AI). Prefer caller-provided intent+summary.
export function buildSearchQuery(args: { name?: string; summary?: string; tags?: string }): string {
  const parts = [args.name, args.summary, args.tags]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
    .replace(/[^a-z0-9\s_-]+/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 4)
    .slice(0, 6);
  return parts.join(' ').trim();
}

export function searchFirstProjects(args: { query: string }) {
  const q = String(args.query || '').trim();
  // MVP: use the best single token to match current LIKE-based search
  const token = q.split(/\s+/).filter(Boolean).sort((a, b) => b.length - a.length)[0] || q;
  const r = searchAll(token);
  const projects = (r.projects || []).map((p) => ({ ...p, why: 'matches name/slug/summary' }));
  const recommended = projects.slice(0, 3).map((p) => ({ slug: p.slug, name: p.name, summary: p.summary, why: p.why }));
  return {
    ok: true as const,
    query: q,
    resultCount: projects.length,
    recommended,
    createAllowed: projects.length === 0,
    createReason: projects.length === 0 ? ('no_results' as const) : ('low_relevance' as const),
  };
}
