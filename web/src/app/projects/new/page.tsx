'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Layout } from '@/components/Layout';
import { Card } from '@/components/Card';
import { PageHeader, Breadcrumbs } from '@/components/PageHeader';
import { useWorkspace } from '@/lib/state';

export default function NewProjectPage() {
  const router = useRouter();
  const { actions } = useWorkspace();

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [summary, setSummary] = useState('');
  const [visibility, setVisibility] = useState<'open' | 'restricted'>('open');

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Create Project"
          subtitle="In-memory only (prototype)."
          breadcrumbs={<Breadcrumbs items={[{ href: '/', label: 'Home' }, { href: '/projects', label: 'Projects' }, { label: 'New' }]} />}
        />

        <Card title="Project form">
          <div className="grid gap-4">
            <label className="grid gap-1">
              <span className="text-xs font-semibold text-slate-600">Name</span>
              <input className="rounded border px-3 py-2" value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <label className="grid gap-1">
              <span className="text-xs font-semibold text-slate-600">Slug (optional)</span>
              <input className="rounded border px-3 py-2 font-mono" value={slug} onChange={(e) => setSlug(e.target.value)} />
            </label>
            <label className="grid gap-1">
              <span className="text-xs font-semibold text-slate-600">Summary</span>
              <textarea className="rounded border px-3 py-2" rows={4} value={summary} onChange={(e) => setSummary(e.target.value)} />
            </label>
            <label className="grid gap-1">
              <span className="text-xs font-semibold text-slate-600">Visibility</span>
              <select
                className="rounded border px-3 py-2"
                value={visibility}
                onChange={(e) => setVisibility(e.target.value === 'restricted' ? 'restricted' : 'open')}
              >
                <option value="open">open</option>
                <option value="restricted">restricted</option>
              </select>
              <span className="text-xs text-slate-600">Restricted projects are UI-only for now (no auth yet).</span>
            </label>

            <div className="flex gap-3">
              <button
                className="rounded bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800"
                type="button"
                onClick={() => {
                  actions.createProject({ name, slug, summary, visibility });
                  const target = (slug || name).trim();
                  if (target) router.push(`/projects/${encodeURIComponent(target.toLowerCase().replace(/[^a-z0-9]+/g, '-'))}`);
                  else router.push('/projects');
                }}
              >
                Create
              </button>
              <button className="rounded border px-4 py-2 text-sm hover:bg-slate-50" type="button" onClick={() => router.push('/projects')}>
                Cancel
              </button>
            </div>
          </div>
        </Card>
      </div>
    </Layout>
  );
}
