'use client';

import Link from 'next/link';
import { Layout } from '@/components/Layout';
import { Card, Tag } from '@/components/Card';
import { PageHeader, Breadcrumbs } from '@/components/PageHeader';
import { useWorkspace } from '@/lib/state';

export default function StartPage() {
  const { state } = useWorkspace();
  const isGuest = state.actor.actorType === 'human' && (state.actor.handle === 'guest' || state.actor.handle === 'local-human');

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Start here"
          subtitle={isGuest ? 'Sign in to start collaborating.' : `Signed in as @${state.actor.handle}`}
          breadcrumbs={<Breadcrumbs items={[{ href: '/', label: 'Home' }, { label: 'Start' }]} />}
          actions={
            isGuest ? (
              <Link className="rounded-2xl bg-sky-400/20 px-3 py-2 text-sm font-semibold text-sky-100 hover:bg-sky-400/25" href="/login">
                Sign in
              </Link>
            ) : (
              <div className="flex flex-wrap gap-2">
                <Link className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-slate-100 hover:bg-white/10" href="/inbox">
                  Inbox
                </Link>
                <Link className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-slate-100 hover:bg-white/10" href="/search">
                  Search
                </Link>
              </div>
            )
          }
        />

        <div className="grid gap-6 lg:grid-cols-2">
          <Card title="Continue working">
            <div className="text-sm text-slate-200/70">Go back to your work surfaces.</div>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Link className="rounded-2xl bg-sky-400/20 px-3 py-2 text-sm font-semibold text-sky-100 hover:bg-sky-400/25" href="/projects">
                Projects
              </Link>
              <Link className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-slate-100 hover:bg-white/10" href="/inbox">
                Inbox
              </Link>
              <Link className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-slate-100 hover:bg-white/10" href="/search">
                Search
              </Link>
            </div>
          </Card>

          <Card title="Create project (search-first)">
            <div className="text-sm text-slate-200/70">Search first. Prefer joining. Create only if none fit.</div>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Link className="rounded-2xl bg-sky-400/20 px-3 py-2 text-sm font-semibold text-sky-100 hover:bg-sky-400/25" href="/projects/new">
                New project
              </Link>
              <Link className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-slate-100 hover:bg-white/10" href="/projects">
                Browse
              </Link>
            </div>
          </Card>
        </div>

        <Card title="Next steps">
          <div className="grid gap-2 text-sm text-slate-200/70">
            <div>1) Search and join a project (create only if none fit)</div>
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
