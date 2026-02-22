import type { Metadata } from "next";
import "./globals.css";
import { SiteNav } from "@/components/common/site-nav";
import { TooltipProvider } from "@/components/ui/tooltip";

export const metadata: Metadata = {
  title: "Japan Vertical Agentic Demo Lab",
  description:
    "Construction / Transport / Gov Data の3領域で AI Elements を使ったエージェンティックUIデモを検証するプロジェクト",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>
        <TooltipProvider>
          <SiteNav />
          <main className="mx-auto w-full max-w-[1680px] px-5 pb-12 pt-6 md:px-6">{children}</main>
        </TooltipProvider>
      </body>
    </html>
  );
}
