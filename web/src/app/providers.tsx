'use client';

import { WorkspaceProvider } from '@/lib/state';

export function Providers({ children }: { children: React.ReactNode }) {
  return <WorkspaceProvider>{children}</WorkspaceProvider>;
}
