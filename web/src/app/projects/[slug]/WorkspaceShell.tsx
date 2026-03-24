import Link from 'next/link';

const baseItems = (slug: string) => [
  { href: `/projects/${slug}#overview`, label: 'Overview' },
  { href: `/projects/${slug}#tasks`, label: 'Tasks' },
  { href: `/projects/${slug}#proposals`, label: 'Proposals' },
  { href: `/projects/${slug}#files`, label: 'Files' },
  { href: `/projects/${slug}#decisions`, label: 'Decisions' },
  { href: `/projects/${slug}#people`, label: 'People' },
  { href: `/projects/${slug}#timeline`, label: 'Timeline' },
];

export function WorkspaceShell({ slug, children }: { slug: string; children: React.ReactNode }) {
  const items = baseItems(slug);

  return (
    <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
      {/* Desktop left nav */}
      <aside className="hidden rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur lg:block">
        <div className="text-xs font-semibold text-slate-200/70">Workspace</div>
        <div className="mt-1 font-mono text-sm text-slate-50">{slug}</div>
        <div className="mt-4 flex flex-col gap-1 text-sm">
          {items.map((it) => (
            <Link key={it.href} className="rounded-xl px-3 py-2 text-slate-200/70 hover:bg-white/5 hover:text-slate-50" href={it.href}>
              {it.label}
            </Link>
          ))}
        </div>
        <div className="mt-4 border-t border-white/10 pt-4">
          <div className="text-xs font-semibold text-slate-200/70">Quick actions</div>
          <div className="mt-2 grid gap-2 text-xs">
            <Link className="rounded-xl border border-white/10 bg-white/5 px-2 py-1 text-slate-100 hover:bg-white/10" href={`/projects/${slug}#tasks`}>
              + New task
            </Link>
            <Link className="rounded-xl border border-white/10 bg-white/5 px-2 py-1 text-slate-100 hover:bg-white/10" href={`/projects/${slug}/proposals/new`}>
              + New proposal
            </Link>
            <Link className="rounded-xl border border-white/10 bg-white/5 px-2 py-1 text-slate-100 hover:bg-white/10" href={`/projects/${slug}#people`}>
              Invite / People ops
            </Link>
            <Link className="rounded-xl border border-white/10 bg-white/5 px-2 py-1 text-slate-100 hover:bg-white/10" href={`/inbox`}>
              Inbox
            </Link>
          </div>
          <div className="mt-3 text-xs text-slate-200/60">Operational surface: tasks, proposals, files, decisions, people.</div>
        </div>
      </aside>

      {/* Mobile top nav */}
      <div className="lg:hidden">
        <div className="-mx-4 border-b border-white/10 bg-white/5 px-4 py-3 backdrop-blur">
          <div className="mb-2 text-xs font-semibold text-slate-200/70">Workspace</div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {items.map((it) => (
              <Link
                key={it.href}
                className="whitespace-nowrap rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-100/90"
                href={it.href}
              >
                {it.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-6">{children}</div>
    </div>
  );
}
