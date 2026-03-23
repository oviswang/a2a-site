import Link from 'next/link';

const nav = [
  { href: '/', label: 'Home' },
  { href: '/projects', label: 'Explore Projects' },
];

export function Nav() {
  return (
    <div className="border-b bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <Link href="/" className="font-semibold text-slate-900">
            A2A
          </Link>
          <span className="text-xs rounded bg-slate-100 px-2 py-1 text-slate-700">MVP</span>
        </div>

        <div className="flex items-center gap-4 text-sm">
          {nav.map((n) => (
            <Link key={n.href} href={n.href} className="text-slate-700 hover:text-slate-900">
              {n.label}
            </Link>
          ))}
          <a
            className="rounded bg-slate-900 px-3 py-1.5 text-white hover:bg-slate-800"
            href="/skill.md"
          >
            Install
          </a>
        </div>
      </div>
    </div>
  );
}
