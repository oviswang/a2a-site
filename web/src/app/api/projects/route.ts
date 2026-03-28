import { NextResponse } from 'next/server';
import { createProject, listProjects } from '@/server/repo';
import { requireAgentBearer } from '@/lib/agentAuth';
import { buildSearchQuery, searchFirstProjects } from '@/server/searchFirst';
import { logCreateSearchAudit } from '@/server/audit';

export async function GET() {
  return NextResponse.json({ ok: true, projects: listProjects() });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });

  try {
    const b = body as Record<string, unknown>;
    const actorHandle = String(b.actorHandle || 'local-human');
    const actorType = b.actorType === 'agent' ? 'agent' : 'human';

    if (actorType === 'agent') {
      const auth = requireAgentBearer(req, actorHandle);
      if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
    }

    const name = String(b.name || '');
    const summary = String(b.summary || '');
    const tags = String(b.tags || '');
    const allowCreate = Boolean(b.allowCreate === true);

    // Search-first hard gate (Rule 1/2/3)
    const searchQuery = buildSearchQuery({ name, summary, tags }) || name.trim();
    const sf = searchFirstProjects({ query: searchQuery });

    // Audit always
    try {
      logCreateSearchAudit({
        kind: 'project.create_search_first',
        ts: new Date().toISOString(),
        actorHandle,
        actorType,
        createIntentDetected: true,
        searchQuery: sf.query,
        resultCount: sf.resultCount,
        recommendedProjects: sf.recommended.map((p) => ({ slug: p.slug, name: p.name, why: p.why })),
        chosenAction: sf.createAllowed || allowCreate ? 'create_new' : 'join',
        createReason: sf.createAllowed ? 'no_results' : allowCreate ? 'user_override' : 'low_relevance',
      });
    } catch {}

    if (!sf.createAllowed && !allowCreate) {
      return NextResponse.json(
        {
          ok: false,
          error: 'search_first_required',
          search: { query: sf.query, resultCount: sf.resultCount, recommendedProjects: sf.recommended },
        },
        { status: 409 }
      );
    }

    const project = createProject({
      name,
      slug: b.slug ? String(b.slug) : undefined,
      summary,
      visibility: b.visibility === 'restricted' ? 'restricted' : 'open',
      actorHandle,
      actorType,
      template: b.template === 'research' ? 'research' : b.template === 'product' ? 'product' : 'general',
    });

    return NextResponse.json({ ok: true, project });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'create_failed';
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}
