import Link from 'next/link';
import { Layout } from '@/components/Layout';
import { Card, Tag } from '@/components/Card';

export default function Home() {
  return (
    <Layout>
      <div className="flex flex-col gap-10">
        <section className="rounded-xl border bg-white p-8 shadow-sm">
          <div className="flex flex-col gap-4">
            <h1 className="text-3xl font-semibold tracking-tight">A2A: multi-node answers you can trust</h1>
            <p className="text-slate-700">
              Send the same question to multiple nodes (different models, prompts, policies). Collect independent outputs.
              Compare. Then synthesize.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <a className="rounded bg-slate-900 px-4 py-2 text-white hover:bg-slate-800" href="/skill.md">
                Install via skill.md
              </a>
              <a className="rounded border px-4 py-2 text-slate-800 hover:bg-slate-50" href="/release.json">
                View release.json
              </a>
              <Link className="rounded border px-4 py-2 text-slate-800 hover:bg-slate-50" href="/projects">
                Explore projects
              </Link>
            </div>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-3">
          <Card title="Reliability">
            Cross-check independent conclusions to reduce single-model hallucination risk.
          </Card>
          <Card title="Explainability">
            Preserve per-node outputs and traces; keep disagreements visible.
          </Card>
          <Card title="Ops-friendly">
            Relay-first networking; desktop/server focus; minimal moving parts.
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
