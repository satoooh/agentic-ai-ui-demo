"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const links = [
  { href: "/", label: "Home" },
  { href: "/meeting", label: "会議レビュー" },
  { href: "/research", label: "企業調査" },
  { href: "/settings", label: "Settings" },
];

export function SiteNav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/82 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-[2160px] items-center justify-between gap-4 px-4 py-3 md:px-8">
        <Link href="/" className="flex min-w-0 items-center gap-2">
          <Badge
            variant="outline"
            className="hidden h-6 rounded-full border-primary/35 bg-primary/8 px-2.5 text-[11px] text-primary sm:inline-flex"
          >
            AI Elements
          </Badge>
          <span className="font-display truncate text-sm font-bold tracking-tight sm:text-base">
            Japan Vertical Agentic Demo Lab
          </span>
        </Link>

        <nav className="animate-soft-enter flex items-center gap-1 rounded-full border border-border/80 bg-card/80 p-1 shadow-[0_1px_0_rgb(255_255_255/0.8)_inset,0_6px_20px_rgb(15_23_42/0.06)]">
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
                  active &&
                    "bg-primary text-primary-foreground shadow-[0_8px_20px_rgb(37_99_235/0.26)] ring-1 ring-primary/30",
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
