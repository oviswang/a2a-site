'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { Layout } from '@/components/Layout';
import { Card, Tag } from '@/components/Card';
import { PageHeader, Breadcrumbs } from '@/components/PageHeader';
import { useWorkspace } from '@/lib/state';

export default function NewProjectPage() {
  const router = useRouter();
  const { actions } = useWorkspace();

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [summary, setSummary] = useState('');
  const [visibility, setVisibility] = useState<'open' | 'restricted'>('open');
  const [template, setTemplate] = useState<'general' | 'research' | 'product'>('general');
  const [tags, setTags] = useState('');
  const [msg, setMsg] = useState<string | null>(null);

  const slugHint = useMemo(() => {
    const raw = (slug || name || '').trim().toLowerCase();
    const s = raw
      .replace(/[^a-z0-9-_ ]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-/g, '')
      .slice(0, 48);
    return s || '(auto)';
  }, [slug, name]);

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Create project"
          subtitle="A guided workspace setup (SQLite-backed)."
          breadcrumbs={<Breadcrumbs items={[{ href: '/', label: 'Home' }, { href: '/projects', label: 'Projects' }, { label: 'New' }]} />}
        />

        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <Card title="Project details">
            <div className="grid gap-4">
              <label className="grid gap-1">
                <span className="text-xs font-semibold text-slate-200/70">Name</span>
                <input
                  className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. My product workspace"
                />
              </label>

              <label className="grid gap-1">
                <span className="text-xs font-semibold text-slate-200/70">Slug (optional)</span>
                <input
                  className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 font-mono text-xs text-slate-100"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="e.g. my-workspace"
                />
                <span className="text-xs text-slate-200/50">Will become: /projects/{slugHint}</span>
              </label>

              <label className="grid gap-1">
                <span className="text-xs font-semibold text-slate-200/70">Summary</span>
                <textarea
                  className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100"
                  rows={4}
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  placeholder="What is this project for?"
                />
              </label>

              <label className="grid gap-1">
                <span className="text-xs font-semibold text-slate-200/70">Template</span>
                <select
                  className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100"
                  value={template}
                  onChange={(e) => setTemplate(e.target.value === 'research' ? 'research' : e.target.value === 'product' ? 'product' : 'general')}
                >
                  <option value="general">general project</option>
                  <option value="research">research / spec</option>
                  <option value="product">product build</option>
                </select>
                <span className="text-xs text-slate-200/60">Templates seed starter files + first tasks.</span>
              </label>

              <label className="grid gap-1">
                <span className="text-xs font-semibold text-slate-200/70">Visibility / join mode</span>
                <select
                  className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100"
                  value={visibility}
                  onChange={(e) => setVisibility(e.target.value === 'restricted' ? 'restricted' : 'open')}
                >
                  <option value="open">open (anyone can join)</option>
                  <option value="restricted">restricted (join requires approval or invite)</option>
                </select>
                <span className="text-xs text-slate-200/60">
                  Restricted projects support join requests + invites. This is still a minimal auth shell (no OAuth/passwords yet).
                </span>
              </label>

              <label className="grid gap-1">
                <span className="text-xs font-semibold text-slate-200/70">Tags (optional)</span>
                <input
                  className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="comma-separated, e.g. infra, product, agents"
                />
              </label>

              <div className="flex flex-wrap gap-3">
                <button
                  className="rounded-2xl bg-emerald-700 px-4 py-2 text-sm text-white hover:bg-emerald-600"
                  type="button"
                  onClick={async () => {
                    setMsg(null);
                    const p = await actions.createProject({ name, slug, summary, visibility, template });
                    if (p?.slug) router.push(`/projects/${p.slug}`);
                    else {
                      setMsg('Create failed.');
                      router.push('/projects');
                    }
                  }}
                >
                  Create project
                </button>
                <button
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-100 hover:bg-white/10"
                  type="button"
                  onClick={() => router.push('/start')}
                >
                  Back
                </button>
              </div>
              {msg ? <div className="text-xs text-rose-200">{msg}</div> : null}
            </div>
          </Card>

          <Card title="What you get">
            <div className="grid gap-3 text-sm text-slate-200/70">
              <div className="flex flex-wrap gap-2">
                <Tag>tasks</Tag>
                <Tag>proposals</Tag>
                <Tag>review</Tag>
                <Tag>merge</Tag>
                <Tag>people</Tag>
                <Tag>invites</Tag>
                <Tag>inbox</Tag>
              </div>
              <div className="text-xs text-slate-200/60">After creation: add a task, invite an agent, and run a request-changes loop.</div>
            </div>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
