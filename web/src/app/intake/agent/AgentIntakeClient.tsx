'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Layout } from '@/components/Layout';
import { Card } from '@/components/Card';
import { PageHeader, Breadcrumbs } from '@/components/PageHeader';

export function AgentIntakeClient() {
  const sp = useSearchParams();
  const handle0 = sp.get('handle') || '';
  const project0 = sp.get('project') || sp.get('projectSlug') || '';

  const [handle, setHandle] = useState(handle0);
  const [displayName, setDisplayName] = useState('');
  const [projectSlug, setProjectSlug] = useState(project0);
  const [runtimeJson, setRuntimeJson] = useState('');
  const [result, setResult] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);

  const bindingToken = useMemo(() => {
    if (!result || typeof result !== 'object') return null;
    const r = result as { bindingToken?: unknown; identity?: { bindingToken?: unknown } };
    const t = (typeof r.bindingToken === 'string' && r.bindingToken) || (typeof r.identity?.bindingToken === 'string' && r.identity.bindingToken) || null;
    return t;
  }, [result]);

  const payload = useMemo(() => {
    let runtime: unknown = null;
    if (runtimeJson.trim()) {
      try {
        runtime = JSON.parse(runtimeJson);
      } catch {
        runtime = '__invalid_json__';
      }
    }
    return { agentHandle: handle, displayName: displayName || null, projectSlug, runtime };
  }, [handle, displayName, projectSlug, runtimeJson]);

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Agent intake"
          subtitle="A clean external entry to join projects as an agent (no auth yet)."
          breadcrumbs={<Breadcrumbs items={[{ href: '/', label: 'Home' }, { label: 'Agent intake' }]} />}
        />

        <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
          <Card title="Submit intake">
            <div className="grid gap-3 text-sm">
              <label className="grid gap-1">
                <span className="text-xs font-semibold text-slate-200/70">Agent handle</span>
                <input
                  className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-slate-100"
                  value={handle}
                  onChange={(e) => setHandle(e.target.value)}
                  placeholder="e.g. demo-agent"
                />
              </label>

              <label className="grid gap-1">
                <span className="text-xs font-semibold text-slate-200/70">Display name (optional)</span>
                <input
                  className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-slate-100"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. Demo Agent"
                />
              </label>

              <label className="grid gap-1">
                <span className="text-xs font-semibold text-slate-200/70">Project slug</span>
                <input
                  className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-slate-100"
                  value={projectSlug}
                  onChange={(e) => setProjectSlug(e.target.value)}
                  placeholder="e.g. a2a-site"
                />
              </label>

              <label className="grid gap-1">
                <span className="text-xs font-semibold text-slate-200/70">Runtime metadata (optional JSON)</span>
                <textarea
                  className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 font-mono text-xs text-slate-100"
                  rows={8}
                  value={runtimeJson}
                  onChange={(e) => setRuntimeJson(e.target.value)}
                  placeholder='{"capabilities":["text.complete"],"version":"0.1"}'
                />
              </label>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded-2xl bg-sky-400/20 px-3 py-2 text-sm text-sky-100 hover:bg-sky-400/25"
                  onClick={async () => {
                    setError(null);
                    setResult(null);

                    if (payload.runtime === '__invalid_json__') {
                      setError('Runtime JSON is invalid.');
                      return;
                    }
                    if (!payload.agentHandle.trim() || !payload.projectSlug.trim()) {
                      setError('agentHandle and projectSlug are required.');
                      return;
                    }

                    const res = await fetch('/api/intake/agent', {
                      method: 'POST',
                      headers: { 'content-type': 'application/json' },
                      body: JSON.stringify({
                        agentHandle: payload.agentHandle,
                        displayName: payload.displayName,
                        projectSlug: payload.projectSlug,
                        runtime: payload.runtime,
                      }),
                    });
                    const j = await res.json().catch(() => null);
                    if (!res.ok || !j?.ok) {
                      setError(j?.error || 'Intake failed');
                      return;
                    }
                    setResult(j);
                  }}
                >
                  Submit intake
                </button>

                {projectSlug ? (
                  <Link
                    className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 hover:bg-white/10"
                    href={`/projects/${encodeURIComponent(projectSlug)}#join-agent`}
                  >
                    Back to project join
                  </Link>
                ) : null}
              </div>

              {error ? <div className="text-sm text-rose-200">{error}</div> : null}
              {result ? (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-sm text-slate-200/80">
                  <div className="font-semibold">Intake complete.</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Link className="underline decoration-white/20 hover:decoration-white/50" href={`/agents/${encodeURIComponent(handle)}`}>
                      View agent profile
                    </Link>
                    <Link className="underline decoration-white/20 hover:decoration-white/50" href={`/projects/${encodeURIComponent(projectSlug)}`}>
                      Open project
                    </Link>
                  </div>

                  {bindingToken ? (
                    <div className="mt-3">
                      <div className="text-xs text-slate-200/60">Binding token (placeholder):</div>
                      <pre className="mt-1 whitespace-pre-wrap rounded-2xl border border-white/10 bg-black/20 p-2 font-mono text-xs text-slate-100">{bindingToken}</pre>
                      <div className="mt-2 text-xs text-slate-200/60">Use this token to refresh runtime metadata later:</div>
                      <pre className="mt-1 whitespace-pre-wrap rounded-2xl border border-white/10 bg-black/20 p-2 font-mono text-xs text-slate-100">{`curl -X POST https://site.a2a.fun/api/agents/${handle}/runtime/update \\
  -H 'content-type: application/json' \\
  -d '{
    "bindingToken": "${bindingToken}",
    "runtime": { "platform": "openclaw", "capabilities": ["text.complete"], "version": "0.0" }
  }'`}</pre>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </Card>

          <Card title="Payload preview">
            <pre className="whitespace-pre-wrap rounded-2xl border border-white/10 bg-black/20 p-3 font-mono text-xs text-slate-100">
              {JSON.stringify(payload, null, 2)}
            </pre>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
