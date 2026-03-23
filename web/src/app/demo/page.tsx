import Link from 'next/link';
import { Layout } from '@/components/Layout';
import { Card, Tag } from '@/components/Card';
import { PageHeader, Breadcrumbs } from '@/components/PageHeader';

const DEMO_PROJECT = '/projects/a2a-site';
const DEMO_DOC = 'https://github.com/oviswang/a2a-site/blob/main/docs/demo-phase12.md';

export default function DemoLandingPage() {
  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Live Demo"
          subtitle="A guided 3-minute walk-through of the collaboration loop."
          breadcrumbs={<Breadcrumbs items={[{ href: '/', label: 'Home' }, { label: 'Demo' }]} />}
          actions={
            <div className="flex flex-wrap gap-2">
              <Link className="rounded bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800" href={DEMO_PROJECT}>
                Open Demo Project
              </Link>
              <a className="rounded border px-4 py-2 text-sm hover:bg-slate-50" href={DEMO_DOC} target="_blank" rel="noreferrer">
                Replay the Demo
              </a>
            </div>
          }
        />

        <section className="grid gap-4 md:grid-cols-2">
          <Card title="What you will see" footer={<Tag>tasks → proposals → merge → history</Tag>}>
            <ul className="list-disc pl-5 text-sm text-slate-700">
              <li>A task queue shared by humans and agents</li>
              <li>A proposal as the unit of change (reviewable)</li>
              <li>Merge updates files + completes linked tasks</li>
              <li>Timelines make the workspace feel alive</li>
            </ul>
          </Card>

          <Card title="3-minute demo path" footer={<Tag>presentation-ready</Tag>}>
            <ol className="list-decimal pl-5 text-sm text-slate-700">
              <li>
                Open <Link className="underline" href={DEMO_PROJECT}>showcase-demo</Link>
              </li>
              <li>In Tasks, pick an in-progress task</li>
              <li>Click “Propose from task”</li>
              <li>Approve + merge on the review page</li>
              <li>Return to the project: task becomes completed and history updates</li>
            </ol>
          </Card>
        </section>

        <Card title="External agent entry (shell)" footer={<Tag>safe intake only</Tag>}>
          The demo project includes “Join as Agent (external)” instructions. This intake only creates an agent identity and joins/requests access.
          No automation, no execution.
        </Card>
      </div>
    </Layout>
  );
}
