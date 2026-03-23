'use client';

import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Layout } from '@/components/Layout';
import { Card, Tag } from '@/components/Card';
import { PageHeader, Breadcrumbs } from '@/components/PageHeader';
import { WorkspaceShell } from './WorkspaceShell';
import { useWorkspace } from '@/lib/state';

function splitDirs(paths: string[]) {
  // simple directory grouping: return map dir -> files
  const out: Record<string, string[]> = {};
  for (const p of paths) {
    const parts = p.split('/');
    const dir = parts.length > 1 ? parts.slice(0, -1).join('/') : '';
    out[dir] = out[dir] || [];
    out[dir].push(p);
  }
  for (const k of Object.keys(out)) out[k].sort();
  return out;
}

export default function ProjectDetailPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug || '';
  const router = useRouter();
  const sp = useSearchParams();
  const selected = sp.get('file') || 'README.md';

  const { state } = useWorkspace();
  const project = state.projects.find((p) => p.slug === slug) || null;

  const files = project?.files || [];
  const filePaths = files.map((f) => f.path);
  const tree = splitDirs(filePaths);

  const selectedFile = files.find((f) => f.path === selected) || files[0] || null;
  const proposals = state.proposals.filter((p) => p.projectSlug === slug);

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <PageHeader
          title={project ? project.name : 'Project not found'}
          subtitle={project ? project.summary : `Unknown slug: ${slug}`}
          breadcrumbs={<Breadcrumbs items={[{ href: '/', label: 'Home' }, { href: '/projects', label: 'Projects' }, { label: slug }]} />}
          actions={
            project ? (
              <button
                type="button"
                className="rounded bg-slate-900 px-3 py-2 text-sm text-white hover:bg-slate-800"
                onClick={() => {
                  const fp = selectedFile?.path || 'README.md';
                  router.push(`/projects/${slug}/proposals/new?file=${encodeURIComponent(fp)}`);
                }}
              >
                Create Proposal
              </button>
            ) : null
          }
        />

        {project ? (
          <WorkspaceShell slug={slug}>
            <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
              <aside className="rounded-lg border bg-white p-4 shadow-sm">
                <div className="text-xs font-semibold text-slate-600">Files</div>
                <div className="mt-3 flex flex-col gap-3 text-sm">
                  {Object.keys(tree)
                    .sort()
                    .map((dir) => (
                      <div key={dir || '__root'}>
                        <div className="text-xs font-semibold text-slate-500">{dir || '(root)'}</div>
                        <div className="mt-2 flex flex-col gap-1">
                          {tree[dir].map((p) => {
                            const isSel = p === selectedFile?.path;
                            return (
                              <Link
                                key={p}
                                className={`rounded px-2 py-1 font-mono text-xs hover:bg-slate-50 ${isSel ? 'bg-slate-100 text-slate-900' : 'text-slate-700'}`}
                                href={`/projects/${slug}?file=${encodeURIComponent(p)}`}
                              >
                                {p}
                              </Link>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                </div>
              </aside>

              <div className="flex flex-col gap-6">
                <Card
                  title={selectedFile ? selectedFile.path : 'No file selected'}
                  footer={
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <span>Updated {selectedFile?.updatedAt || '—'}</span>
                      <div className="flex flex-wrap gap-2">
                        <Tag>markdown</Tag>
                        <Tag>{project.visibility}</Tag>
                      </div>
                    </div>
                  }
                >
                  <pre className="whitespace-pre-wrap rounded border bg-slate-50 p-4 text-xs leading-relaxed">
                    {selectedFile?.content || '—'}
                  </pre>
                </Card>

                <Card title="Active proposals">
                  <ul className="list-disc pl-5">
                    {proposals.map((p) => (
                      <li key={p.id}>
                        <Link className="underline" href={`/proposals/${p.id}/review`}>
                          {p.title} ({p.status})
                        </Link>
                      </li>
                    ))}
                    {proposals.length === 0 ? <li>No proposals</li> : null}
                  </ul>
                </Card>

                <Card title="Recent activity">
                  <ul className="list-disc pl-5">
                    {project.activity.slice(0, 8).map((a, idx) => (
                      <li key={idx}>
                        <span className="text-xs text-slate-500">{a.ts.slice(0, 19).replace('T', ' ')} </span>
                        {a.text}
                      </li>
                    ))}
                  </ul>
                </Card>
              </div>
            </div>
          </WorkspaceShell>
        ) : (
          <Card title="Not found">This project slug does not exist in state.</Card>
        )}
      </div>
    </Layout>
  );
}
