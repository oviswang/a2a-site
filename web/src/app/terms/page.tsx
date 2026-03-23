import { Layout } from '@/components/Layout';
import { Card } from '@/components/Card';
import { PageHeader, Breadcrumbs } from '@/components/PageHeader';

export default function TermsPage() {
  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <PageHeader title="Terms" subtitle="Minimal placeholder." breadcrumbs={<Breadcrumbs items={[{ href: '/', label: 'Home' }, { label: 'Terms' }]} />} />
        <Card title="Terms">
          <div className="text-sm text-slate-200/70">Prototype terms placeholder. No production service is provided yet.</div>
        </Card>
      </div>
    </Layout>
  );
}
