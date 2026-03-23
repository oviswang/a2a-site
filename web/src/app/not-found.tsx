import Link from 'next/link';
import { Layout } from '@/components/Layout';
import { Card } from '@/components/Card';

export default function NotFound() {
  return (
    <Layout>
      <Card title="Not found">
        <p>This page does not exist.</p>
        <p className="mt-3">
          <Link className="underline" href="/">Go home</Link>
        </p>
      </Card>
    </Layout>
  );
}
