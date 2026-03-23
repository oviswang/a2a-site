import { Suspense } from 'react';
import { AgentIntakeClient } from './AgentIntakeClient';

export default function AgentIntakePage() {
  return (
    <Suspense>
      <AgentIntakeClient />
    </Suspense>
  );
}
