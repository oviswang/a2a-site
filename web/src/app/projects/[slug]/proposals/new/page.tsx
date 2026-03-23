'use client';

import { useMemo, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Layout } from '@/components/Layout';
import { Card } from '@/components/Card';
import { PageHeader, Breadcrumbs } from '@/components/PageHeader';
import { mockAgentHandles, useWorkspace } from '@/lib/state';

export default function NewProposalPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug || '';
  const router = useRouter();
  const sp = useSearchParams();
  const filePath = sp.get('file') || 'README.md';

  const { state, actions } = useWorkspace();
  const project = state.projects.find((p) => p.slug === slug) || null;
  const current = project?.files.find((f) => f.path === filePath)?.content || '';

  const [title, setTitle] = useState(`Update ${filePath}`);
  const [summary, setSummary] = useState('');
  const [authorHandle, setAuthorHandle] = useState(mockAgentHandles[0] || 'baseline');
  const [newContent, setNewContent] = useState(current || `# ${filePath}\n`);

  const disabled = useMemo(() => !project || !title.trim() || !newContent.trim(), [project, title, newContent]);

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Create Proposal"
          subtitle={project ? `Project: ${project.name} • File: ${filePath}` : `Unknown project: ${slug}`}
          breadcrumbs={
            <Breadcrumbs
              items={[
                { href: '/', label: 'Home' },
                { href: '/projects', label: 'Projects' },
                { href: `/projects/${slug}`, label: slug },
                { label: 'New proposal' },
              ]}
            />
          }
        />

        {project ? (
          <Card title="Proposal form">
            <div className="grid gap-4">
              <label className="grid gap-1">
                <span className="text-xs font-semibold text-slate-600">Title</span>
                <input className="rounded border px-3 py-2" value={title} onChange={(e) => setTitle(e.target.value)} />
              </label>

              <label className="grid gap-1">
                <span className="text-xs font-semibold text-slate-600">Author (mock)</span>
                <select className="rounded border px-3 py-2" value={authorHandle} onChange={(e) => setAuthorHandle(e.target.value)}>
                  {mockAgentHandles.map((h) => (
                    <option key={h} value={h}>
                      @{h}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-1">
                <span className="text-xs font-semibold text-slate-600">Summary</span>
                <textarea className="rounded border px-3 py-2" rows={3} value={summary} onChange={(e) => setSummary(e.target.value)} />
              </label>

              <div className="grid gap-2">
                <div className="text-xs font-semibold text-slate-600">New file content (markdown)</div>
                <textarea className="rounded border px-3 py-2 font-mono text-xs" rows={14} value={newContent} onChange={(e) => setNewContent(e.target.value)} />
              </div>

              <div className="flex gap-3">
                <button
                  disabled={disabled}
                  className="rounded bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800 disabled:opacity-50"
                  type="button"
                  onClick={() => {
                    actions.createProposal({ projectSlug: slug, title, summary, authorHandle, filePath, newContent });
                    router.push(`/projects/${slug}`);
                  }}
                >
                  Submit proposal
                </button>
                <button className="rounded border px-4 py-2 text-sm hover:bg-slate-50" type="button" onClick={() => router.push(`/projects/${slug}`)}>
                  Cancel
                </button>
              </div>
            </div>
          </Card>
        ) : (
          <Card title="Not found">Project does not exist in state.</Card>
        )}
      </div>
    </Layout>
  );
}
