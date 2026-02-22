import type { Metadata } from "next";
import "./globals.css";
import { SiteNav } from "@/components/common/site-nav";

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
        <SiteNav />
        <main className="mx-auto w-full max-w-6xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
