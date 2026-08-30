import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";
import AuthProvider from "@/components/AuthProvider";

const SITE_URL = "https://tabakomap.vercel.app";
const TITLE = "タバコマップ";
const DESCRIPTION = "大阪の喫煙所・喫煙可能店を地図で検索。利用条件つきで案内するので迷わず吸える場所が見つかります。銘柄データベース・たばこニュースも掲載。";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: TITLE,
    template: `%s | ${TITLE}`,
  },
  description: DESCRIPTION,
  keywords: ["喫煙所", "喫煙可能店", "たばこ", "大阪", "マップ", "加熱式タバコ", "シーシャ"],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: TITLE,
  },
  openGraph: {
    type: "website",
    locale: "ja_JP",
    url: SITE_URL,
    siteName: TITLE,
    title: TITLE,
    description: DESCRIPTION,
    images: [{ url: "/icon-512.png", width: 512, height: 512 }],
  },
  twitter: {
    card: "summary",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/icon-512.png"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#1a1a1a",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" className="h-full">
      <body className="h-full">
        <AuthProvider>{children}</AuthProvider>
        {/* どちらも計測 ID が不要で、Vercel 上でだけ動く。ローカルでは何も送らない */}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
