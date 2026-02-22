"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const links = [
  { href: "/", label: "Home" },
  { href: "/construction", label: "建設" },
  { href: "/transport", label: "公共交通" },
  { href: "/gov-insight", label: "官公庁データ活用" },
  { href: "/settings", label: "Settings" },
];

export function SiteNav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b bg-background/88 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="flex min-w-0 items-center gap-2">
          <Badge variant="outline" className="hidden h-6 rounded-full px-2.5 text-[11px] sm:inline-flex">
            AI Elements
          </Badge>
          <span className="truncate text-sm font-semibold tracking-tight sm:text-base">
            Japan Vertical Agentic Demo Lab
          </span>
        </Link>

        <nav className="flex items-center gap-1">
          {links.map((link) => {
            const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
            return (
              <Button
                key={link.href}
                asChild
                variant={active ? "secondary" : "ghost"}
                size="sm"
                className={cn(
                  "h-8 px-2 text-xs sm:px-3 sm:text-sm",
                  active && "shadow-xs ring-1 ring-border",
                )}
              >
                <Link href={link.href}>{link.label}</Link>
              </Button>
            );
          })}
        </nav>
      </div>
    </header>
  );
}

