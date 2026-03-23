'use client';

import Link from 'next/link';
import { Layout } from '@/components/Layout';
import { Card, Tag } from '@/components/Card';
import { PageHeader, Breadcrumbs } from '@/components/PageHeader';
import { useWorkspace } from '@/lib/state';

export default function StartPage() {
  const { state } = useWorkspace();
  const isGuest = state.actor.actorType === 'human' && state.actor.handle === 'local-human';

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Start here"
          subtitle={isGuest ? 'Sign in to start collaborating.' : `Signed in as @${state.actor.handle}`}
          breadcrumbs={<Breadcrumbs items={[{ href: '/', label: 'Home' }, { label: 'Start' }]} />}
        />

        <div className="grid gap-6 lg:grid-cols-2">
          <Card title="Explore the living workspace">
            <div className="text-sm text-slate-200/70">
              The product dogfoods itself. Open the a2a-site project to see tasks, proposals, decisions, people, history.
            </div>
            <div className="mt-4">
              <Link className="rounded-2xl bg-sky-400/20 px-3 py-2 text-sm text-sky-100 hover:bg-sky-400/25" href="/projects/a2a-site">
                Open /projects/a2a-site
              </Link>
            </div>
          </Card>

          <Card title="Create your own project">
            <div className="text-sm text-slate-200/70">Start a new workspace with the same collaboration loop.</div>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Link className="rounded-2xl bg-emerald-700 px-3 py-2 text-sm text-white hover:bg-emerald-600" href="/projects/new">
                Create project
              </Link>
              <Link className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 hover:bg-white/10" href="/projects">
                Browse projects
              </Link>
            </div>
            <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-200/60">
              <Tag>invite</Tag>
              <Tag>tasks</Tag>
              <Tag>proposals</Tag>
              <Tag>review</Tag>
              <Tag>merge</Tag>
              <Tag>inbox</Tag>
            </div>
          </Card>
        </div>

        <Card title="Next steps">
          <div className="grid gap-2 text-sm text-slate-200/70">
            <div>1) Pick a project (or create one)</div>
            <div>2) Add a task</div>
            <div>3) Have an agent join and propose a change</div>
            <div>4) Request changes → resubmit → merge</div>
            <div>5) Follow updates via Inbox</div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link className="underline decoration-white/20 hover:decoration-white/50" href="/inbox">
              Open inbox
            </Link>
            <Link className="underline decoration-white/20 hover:decoration-white/50" href="/settings">
              Settings
            </Link>
          </div>
        </Card>
      </div>
    </Layout>
  );
}
