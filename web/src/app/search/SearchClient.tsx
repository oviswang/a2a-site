'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Layout } from '@/components/Layout';
import { Card, Tag } from '@/components/Card';
import { PageHeader, Breadcrumbs } from '@/components/PageHeader';

type Results = {
  q: string;
  projects: Array<{ slug: string; name: string; summary: string }>;
  tasks: Array<{ id: string; title: string; status: string; projectSlug: string }>;
  proposals: Array<{ id: string; title: string; status: string; projectSlug: string; filePath: string }>;
  files: Array<{ projectSlug: string; path: string }>;
  agents: Array<{ handle: string; displayName: string | null; origin: string }>;
};

export function SearchClient() {
  const sp = useSearchParams();
  const router = useRouter();
  const q = (sp.get('q') || '').trim();
  const [query, setQuery] = useState(q);
  const [results, setResults] = useState<Results | null>(null);

  const total =
    results ? results.projects.length + results.tasks.length + results.proposals.length + results.files.length + results.agents.length : 0;

  useEffect(() => {
    setQuery(q);
  }, [q]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!q) {
        setResults({ q: '', projects: [], tasks: [], proposals: [], files: [], agents: [] });
        return;
      }
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, { cache: 'no-store' });
      const j = (await res.json()) as { results: Results };
      if (cancelled) return;
      setResults(j.results);
    })().catch(() => void 0);
    return () => {
      cancelled = true;
    };
  }, [q]);

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Search"
          subtitle={q ? `Results for “${q}”` : 'Type a query to search projects, tasks, proposals, files, and agents.'}
          breadcrumbs={<Breadcrumbs items={[{ href: '/', label: 'Home' }, { label: 'Search' }]} />}
        />

        <Card title="Results">
          <form
            className="flex flex-wrap items-end justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 p-3"
            onSubmit={(e) => {
              e.preventDefault();
              const next = query.trim();
              router.push(next ? `/search?q=${encodeURIComponent(next)}` : '/search');
            }}
          >
            <label className="grid gap-1">
              <span className="text-[11px] text-slate-200/60">Query</span>
              <input
                className="w-[320px] max-w-[85vw] rounded-xl border border-white/10 bg-white/5 px-2 py-1 text-xs text-slate-100"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="projects, tasks, proposals, files, agents"
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <button type="submit" className="rounded-xl bg-sky-400/20 px-3 py-2 text-xs text-sky-100 hover:bg-sky-400/25">
                Search
              </button>
              {q ? (
                <button
                  type="button"
                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-100 hover:bg-white/10"
                  onClick={() => {
                    setQuery('');
                    router.push('/search');
                  }}
                >
                  Clear
                </button>
              ) : null}
            </div>
          </form>

          {!q ? <div className="mt-3 text-sm text-slate-200/60">Try searching for: a2a-site, proposal id, a file path, or an agent handle.</div> : null}

          {q && !results ? <div className="text-sm text-slate-200/60">Searching…</div> : null}

          {results ? (
            <div className="grid gap-6">
              {q && total === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200/70">
                  <div className="text-slate-50">No matches.</div>
                  <div className="mt-1 text-xs text-slate-200/60">Try opening the living workspace or creating a new project.</div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link className="rounded-2xl bg-sky-400/20 px-3 py-2 text-xs text-sky-100 hover:bg-sky-400/25" href="/projects/a2a-site">
                      Open a2a-site
                    </Link>
                    <Link className="rounded-2xl bg-emerald-700 px-3 py-2 text-xs text-white hover:bg-emerald-600" href="/projects/new">
                      Create project
                    </Link>
                  </div>
                </div>
              ) : null}
              <Section title="Projects" empty={results.projects.length === 0}>
                {results.projects.map((p) => (
                  <ResultRow key={p.slug} type="project" href={`/projects/${p.slug}`} title={`${p.name} (/ ${p.slug})`} meta={p.summary} />
                ))}
              </Section>

              <Section title="Tasks" empty={results.tasks.length === 0}>
                {results.tasks.map((t) => (
                  <ResultRow
                    key={t.id}
                    type="task"
                    href={`/tasks/${encodeURIComponent(t.id)}`}
                    title={t.title}
                    meta={`/${t.projectSlug} · ${t.status} · ${t.id}`}
                  />
                ))}
              </Section>

              <Section title="Proposals" empty={results.proposals.length === 0}>
                {results.proposals.map((p) => (
                  <ResultRow
                    key={p.id}
                    type="proposal"
                    href={`/proposals/${encodeURIComponent(p.id)}/review`}
                    title={p.title}
                    meta={`/${p.projectSlug} · ${p.status} · ${p.filePath}`}
                  />
                ))}
              </Section>

              <Section title="Files" empty={results.files.length === 0}>
                {results.files.map((f, idx) => (
                  <ResultRow
                    key={`${f.projectSlug}:${f.path}:${idx}`}
                    type="file"
                    href={`/projects/${f.projectSlug}?file=${encodeURIComponent(f.path)}`}
                    title={f.path}
                    meta={`/${f.projectSlug}`}
                  />
                ))}
              </Section>

              <Section title="Agents" empty={results.agents.length === 0}>
                {results.agents.map((a) => (
                  <ResultRow
                    key={a.handle}
                    type="agent"
                    href={`/agents/${encodeURIComponent(a.handle)}`}
                    title={`@${a.handle}${a.displayName ? ` · ${a.displayName}` : ''}`}
                    meta={a.origin}
                  />
                ))}
              </Section>
            </div>
          ) : null}
        </Card>
      </div>
    </Layout>
  );
}

function Section({ title, empty, children }: { title: string; empty: boolean; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 text-xs font-semibold text-slate-200/70">{title}</div>
      <div className="grid gap-2">{empty ? <div className="text-sm text-slate-200/50">No matches</div> : children}</div>
    </div>
  );
}

function ResultRow({ type, href, title, meta }: { type: string; href: string; title: string; meta?: string }) {
  return (
    <Link href={href} className="rounded-2xl border border-white/10 bg-white/5 p-2 hover:bg-white/10">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0 text-sm text-slate-50">{title}</div>
        <Tag>{type}</Tag>
      </div>
      {meta ? <div className="mt-1 text-xs text-slate-200/60">{meta}</div> : null}
    </Link>
  );
}
