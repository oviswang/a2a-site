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

  const canCreate = !!name.trim() && !!summary.trim();

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Create project"
          subtitle="Start a new workspace for tasks, proposals, files, and decisions."
          breadcrumbs={<Breadcrumbs items={[{ href: '/', label: 'Home' }, { href: '/projects', label: 'Projects' }, { label: 'New' }]} />}
        />

        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="grid gap-6">
            <Card title="Project basics">
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
                <span className="text-xs text-slate-200/60">Slug (optional)</span>
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

              </div>
            </Card>

            <Card title="Workspace setup">
              <div className="grid gap-4">
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
                <span className="text-xs font-semibold text-slate-200/70">Access</span>
                <select
                  className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100"
                  value={visibility}
                  onChange={(e) => setVisibility(e.target.value === 'restricted' ? 'restricted' : 'open')}
                >
                  <option value="open">Open access (anyone can join)</option>
                  <option value="restricted">Restricted access (approval or invite)</option>
                </select>
                <span className="text-xs text-slate-200/60">Use restricted access when you want a review gate for new members.</span>
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

              </div>
            </Card>

            <Card title="What happens next">
              <div className="grid gap-2 text-sm text-slate-200/70">
                <div>1) We create the workspace and starter files/tasks (from the template).</div>
                <div>2) You can add tasks, propose changes, and review/merge proposals.</div>
                <div>3) Your updates come back to you via Inbox.</div>
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  className={`rounded-2xl px-4 py-2 text-sm font-semibold text-white ${canCreate ? 'bg-sky-400/20 text-sky-100 hover:bg-sky-400/25' : 'bg-slate-500/30 text-slate-200/50'}`}
                  type="button"
                  disabled={!canCreate}
                  onClick={async () => {
                    setMsg(null);
                    if (!canCreate) {
                      setMsg('Name + summary are required.');
                      return;
                    }
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
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-100 hover:bg-white/10"
                  type="button"
                  onClick={() => router.push('/projects')}
                >
                  Cancel
                </button>
              </div>
              {msg ? <div className="mt-2 text-xs text-rose-200">{msg}</div> : null}
            </Card>
          </div>

          <Card title="What you get">
            <div className="grid gap-3 text-sm text-slate-200/70">
              <div className="grid gap-2">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                  <div className="text-xs font-semibold text-slate-200/70">Core workspace</div>
                  <div className="mt-1 text-sm text-slate-50">Tasks · Proposals · Files</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                  <div className="text-xs font-semibold text-slate-200/70">Collaboration loop</div>
                  <div className="mt-1 text-sm text-slate-50">Propose → Review → Request changes → Merge</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                  <div className="text-xs font-semibold text-slate-200/70">Signals</div>
                  <div className="mt-1 text-sm text-slate-50">Inbox keeps track of what needs attention</div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
