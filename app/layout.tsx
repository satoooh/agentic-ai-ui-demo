import type { Metadata } from "next";
import "./globals.css";
import { SiteNav } from "@/components/common/site-nav";
import { TooltipProvider } from "@/components/ui/tooltip";

export const metadata: Metadata = {
  title: "Japan Vertical Agentic Demo Lab",
  description:
    "会議レビューを中心に、営業 / 採用 / ITリサーチへ展開できるエージェンティックUIデモを検証するプロジェクト",
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
          <main className="mx-auto w-full max-w-[1920px] px-4 pb-14 pt-6 md:px-8">{children}</main>
        </TooltipProvider>
      </body>
    </html>
  );
}
