import type { Metadata } from "next";
import { IBM_Plex_Mono, Noto_Sans_JP } from "next/font/google";
import "./globals.css";
import { SiteNav } from "@/components/common/site-nav";
import { TooltipProvider } from "@/components/ui/tooltip";

const fontSans = Noto_Sans_JP({
  subsets: ["latin"],
  variable: "--font-sans-jp",
  weight: ["400", "500", "700", "900"],
  display: "swap",
});

const fontMono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Japan Vertical Agentic Demo Lab",
  description:
    "会議レビューAIと企業調査AIの2デモで、エージェンティックUIと根拠付き推論ワークフローを検証するプロジェクト",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className={`${fontSans.variable} ${fontMono.variable} antialiased`}>
        <TooltipProvider>
          <SiteNav />
          <main className="mx-auto w-full max-w-[2160px] px-4 pb-14 pt-6 md:px-8">{children}</main>
        </TooltipProvider>
      </body>
    </html>
  );
}
