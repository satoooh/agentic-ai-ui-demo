"use client";

import Link from "next/link";

export function SiteNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/82 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-[1480px] items-center px-4 py-3 md:px-8">
        <Link href="/" className="min-w-0">
          <span className="font-display truncate text-sm font-bold tracking-tight sm:text-base">
            Agentic UI Demo
          </span>
        </Link>
      </div>
    </header>
  );
}
