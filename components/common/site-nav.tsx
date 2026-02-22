"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const links = [
  { href: "/", label: "Home" },
  { href: "/sales", label: "営業" },
  { href: "/recruiting", label: "採用" },
  { href: "/meeting", label: "会議レビュー" },
  { href: "/research", label: "企業調査" },
  { href: "/settings", label: "Settings" },
];

export function SiteNav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/92 backdrop-blur">
      <div className="mx-auto flex w-full max-w-[1860px] items-center justify-between gap-4 px-5 py-3 md:px-6">
        <Link href="/" className="flex min-w-0 items-center gap-2">
          <Badge variant="outline" className="hidden h-6 rounded-full px-2.5 text-[11px] text-muted-foreground sm:inline-flex">
            AI Elements
          </Badge>
          <span className="truncate text-sm font-semibold tracking-tight sm:text-base">
            Japan Vertical Agentic Demo Lab
          </span>
        </Link>

        <nav className="flex items-center gap-1 rounded-full bg-muted/30 p-1">
          {links.map((link) => {
            const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
            return (
              <Button
                key={link.href}
                asChild
                variant={active ? "secondary" : "ghost"}
                size="sm"
                className={cn(
                  "h-8 rounded-full px-2 text-xs sm:px-3 sm:text-sm",
                  active && "bg-background shadow-xs ring-1 ring-border/80",
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
