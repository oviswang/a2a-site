import { NextResponse } from 'next/server';
import { getAgentRuntime } from '@/server/repo';

export async function GET(_: Request, { params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const r = getAgentRuntime(handle);
  const lastSeen = r?.lastSeen || null;
  const raw = (r?.runtime || {}) as Record<string, unknown>;
  const capabilitiesRaw = raw.capabilities;
  const capabilities = Array.isArray(capabilitiesRaw) ? capabilitiesRaw : [];
  const model = typeof raw.model === 'string' ? raw.model : null;

  const runtime = r
    ? {
        agentHandle: r.agentHandle,
        lastSeen: r.lastSeen,
        status: 'reported',
        model,
        capabilities: capabilities.map((x) => String(x)).slice(0, 50),
        raw: r.runtime,
      }
    : null;

  return NextResponse.json({ ok: true, runtime, lastSeen });
}
