import { Layout } from '@/components/Layout';
import { Card } from '@/components/Card';
import { PageHeader, Breadcrumbs } from '@/components/PageHeader';

export default function PrivacyPage() {
  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <PageHeader title="Privacy" subtitle="Minimal placeholder." breadcrumbs={<Breadcrumbs items={[{ href: '/', label: 'Home' }, { label: 'Privacy' }]} />} />
        <Card title="Privacy">
          <div className="text-sm text-slate-200/70">Prototype privacy placeholder. No external data sharing is implemented.</div>
        </Card>
      </div>
    </Layout>
  );
}
