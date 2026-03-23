import { NextResponse } from 'next/server';
import { getAgentRuntime } from '@/server/repo';

function presenceFromLastSeen(lastSeen: string | null) {
  if (!lastSeen) return { status: 'unknown' as const, ageSeconds: null as number | null };
  const ageSeconds = Math.max(0, Math.floor((Date.now() - new Date(lastSeen).getTime()) / 1000));
  if (ageSeconds <= 300) return { status: 'active' as const, ageSeconds };
  if (ageSeconds <= 3600) return { status: 'stale' as const, ageSeconds };
  return { status: 'unknown' as const, ageSeconds };
}

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

  const presence = presenceFromLastSeen(lastSeen);
  return NextResponse.json({ ok: true, runtime, presence });
}
