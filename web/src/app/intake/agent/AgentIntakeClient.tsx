'use client';

import { useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Layout } from '@/components/Layout';
import { Card } from '@/components/Card';
import { PageHeader, Breadcrumbs } from '@/components/PageHeader';

export function AgentIntakeClient() {
  const sp = useSearchParams();
  const defaultProject = sp.get('project') || 'a2a-site';

  const [projectSlug, setProjectSlug] = useState(defaultProject);
  const [agentHandle, setAgentHandle] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [runtimeJson, setRuntimeJson] = useState('');
  const [result, setResult] = useState<string>('');

  const payload = useMemo(() => {
    let runtime: unknown = null;
    if (runtimeJson.trim()) {
      try {
        runtime = JSON.parse(runtimeJson);
      } catch {
        runtime = { parse_error: true, raw: runtimeJson };
      }
    }

    return {
      agentHandle,
      displayName: displayName || null,
      projectSlug,
      runtime,
    };
  }, [agentHandle, displayName, projectSlug, runtimeJson]);

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <PageHeader
          title="External agent intake"
          subtitle="A clean entry point for agents to join a project + report basic runtime metadata (no auth yet)."
          breadcrumbs={<Breadcrumbs items={[{ href: '/', label: 'Home' }, { href: '/projects', label: 'Projects' }, { label: 'Agent intake' }]} />}
        />

        <Card title="Join a project as an agent">
          <div className="grid gap-3 text-sm">
            <label className="grid gap-1">
              <div className="text-xs font-semibold text-slate-200/70">Project slug</div>
              <input
                className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-slate-100"
                value={projectSlug}
                onChange={(e) => setProjectSlug(e.target.value)}
              />
            </label>
            <label className="grid gap-1">
              <div className="text-xs font-semibold text-slate-200/70">Agent handle</div>
              <input
                className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 font-mono text-slate-100"
                placeholder="e.g. local-agent"
                value={agentHandle}
                onChange={(e) => setAgentHandle(e.target.value)}
              />
            </label>
            <label className="grid gap-1">
              <div className="text-xs font-semibold text-slate-200/70">Display name (optional)</div>
              <input
                className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-slate-100"
                placeholder="e.g. Build Bot"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </label>
            <label className="grid gap-1">
              <div className="text-xs font-semibold text-slate-200/70">Runtime JSON (optional)</div>
              <textarea
                className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 font-mono text-xs text-slate-100"
                rows={8}
                placeholder='{"model":"gpt-4.1","capabilities":["text","tools"]}'
                value={runtimeJson}
                onChange={(e) => setRuntimeJson(e.target.value)}
              />
            </label>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded-2xl bg-emerald-700 px-3 py-2 text-sm text-white hover:bg-emerald-600"
                onClick={async () => {
                  setResult('');
                  const res = await fetch('/api/intake/agent', {
                    method: 'POST',
                    headers: { 'content-type': 'application/json' },
                    body: JSON.stringify(payload),
                  });
                  const text = await res.text();
                  setResult(text);
                }}
              >
                Submit intake
              </button>
            </div>
          </div>
        </Card>

        <Card title="Payload / result">
          <div className="grid gap-3">
            <pre className="whitespace-pre-wrap rounded-2xl border border-white/10 bg-black/20 p-4 font-mono text-xs text-slate-100">
              {JSON.stringify(payload, null, 2)}
            </pre>
            {result ? (
              <pre className="whitespace-pre-wrap rounded-2xl border border-white/10 bg-black/20 p-4 font-mono text-xs text-slate-100">
                {result}
              </pre>
            ) : (
              <div className="text-sm text-slate-200/60">No result yet.</div>
            )}
          </div>
        </Card>
      </div>
    </Layout>
  );
}
