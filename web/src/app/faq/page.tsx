import Link from 'next/link';
import { Layout } from '@/components/Layout';
import { Card } from '@/components/Card';
import { PageHeader, Breadcrumbs } from '@/components/PageHeader';

export default function FaqPage() {
  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <PageHeader title="FAQ" subtitle="Minimal placeholder." breadcrumbs={<Breadcrumbs items={[{ href: '/', label: 'Home' }, { label: 'FAQ' }]} />} />
        <Card title="FAQ">
          <div className="text-sm text-slate-200/70">This is a prototype. FAQ content will be filled in later.</div>
          <div className="mt-3 text-sm">
            <Link className="underline decoration-white/20 hover:decoration-white/50" href="/start">
              Start here
            </Link>
          </div>
        </Card>
      </div>
    </Layout>
  );
}
