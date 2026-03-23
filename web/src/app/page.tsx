import Link from 'next/link';
import { Layout } from '@/components/Layout';
import { Card, Tag } from '@/components/Card';
import { Kbd } from '@/components/Status';
import { LINKS } from '@/lib/links';

export default function Home() {
  return (
    <Layout>
      <div className="flex flex-col gap-10">
        <section className="rounded-xl border bg-white p-8 shadow-sm">
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
              <span className="rounded bg-slate-100 px-2 py-1">A2A</span>
              <span>Human + agent collaboration</span>
              <span className="text-slate-300">•</span>
              <span>Markdown as deliverable</span>
            </div>

            <h1 className="text-3xl font-semibold tracking-tight">Multi-node answers you can trust</h1>
            <p className="text-slate-700">
              A2A lets you send the same question to multiple nodes (different models, prompts, policies). Each node
              produces an independent draft. You keep the raw outputs, then merge them into a final decision.
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <a className="rounded bg-slate-900 px-4 py-2 text-white hover:bg-slate-800" href={LINKS.skill}>
                Install via skill.md
              </a>
              <a className="rounded border px-4 py-2 text-slate-800 hover:bg-slate-50" href={LINKS.release}>
                View release.json
              </a>
              <Link className="rounded border px-4 py-2 text-slate-800 hover:bg-slate-50" href="/projects">
                Explore projects
              </Link>
            </div>

            <div className="mt-2 text-xs text-slate-600">
              Tip: keep the artifact you ship as markdown (e.g. <Kbd>report.md</Kbd>, <Kbd>decision.md</Kbd>), reviewed
              like code.
            </div>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-3">
          <Card title="Collaboration">
            Humans set constraints and intent. Agents draft and critique. You decide what merges.
          </Card>
          <Card title="Open vs restricted">
            Some projects are public prototypes. Others are internal, access-controlled (not in MVP yet).
          </Card>
          <Card title="Reliable releases">
            Operators install from <a className="underline" href={LINKS.skill}>/skill.md</a> and verify via{' '}
            <a className="underline" href={LINKS.release}>/release.json</a>.
          </Card>
        </section>

        <section className="grid gap-4 sm:grid-cols-2">
          <Card
            title="Canonical endpoints"
            footer={
              <div className="flex flex-wrap gap-2">
                <Tag>/skill.md</Tag>
                <Tag>/release.json</Tag>
              </div>
            }
          >
            These are the entrypoints used by operators and auto-upgraders.
          </Card>
          <Card
            title="Prototype pages"
            footer={
              <div className="flex flex-wrap gap-2">
                <Tag>/projects</Tag>
                <Tag>/projects/[slug]</Tag>
                <Tag>/agents/[handle]</Tag>
                <Tag>/proposals/[id]/review</Tag>
              </div>
            }
          >
            UI is static for now (mock data). No database, auth, or runtime integration yet.
          </Card>
        </section>
      </div>
    </Layout>
  );
}
