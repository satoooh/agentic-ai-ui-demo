import Link from "next/link";

const links = [
  { href: "/", label: "Home" },
  { href: "/construction", label: "建設" },
  { href: "/transport", label: "公共交通" },
  { href: "/gov-insight", label: "官公庁データ活用" },
  { href: "/settings", label: "Settings" },
];

export function SiteNav() {
  return (
    <header className="border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3">
        <p className="text-sm font-semibold text-slate-900">Japan Vertical Agentic Demo Lab</p>
        <nav className="flex gap-3 text-sm text-slate-600">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="rounded px-2 py-1 hover:bg-slate-100 hover:text-slate-900">
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
