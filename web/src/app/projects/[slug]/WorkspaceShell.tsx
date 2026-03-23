import Link from 'next/link';

export function WorkspaceShell({
  slug,
  children,
}: {
  slug: string;
  children: React.ReactNode;
}) {
  const items = [
    { href: `/projects/${slug}`, label: 'Overview' },
    { href: `/projects/${slug}#proposals`, label: 'Proposals' },
    { href: `/projects/${slug}#agents`, label: 'Agents' },
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
      <aside className="rounded-lg border bg-white p-4 shadow-sm">
        <div className="text-xs font-semibold text-slate-600">Workspace</div>
        <div className="mt-1 font-mono text-sm text-slate-900">{slug}</div>
        <div className="mt-4 flex flex-col gap-2 text-sm">
          {items.map((it) => (
            <Link key={it.href} className="rounded px-2 py-1 hover:bg-slate-50" href={it.href}>
              {it.label}
            </Link>
          ))}
        </div>
        <div className="mt-4 border-t pt-4 text-xs text-slate-600">
          Treat markdown as deliverable. Keep diffs reviewable.
        </div>
      </aside>
      <div className="flex flex-col gap-6">{children}</div>
    </div>
  );
}
