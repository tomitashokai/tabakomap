import type { Metadata, Viewport } from "next";
import { GoogleAnalytics } from "@next/third-parties/google";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";
import AuthProvider from "@/components/AuthProvider";

/**
 * GA4 の測定 ID。未設定なら計測タグを描画しない。
 * ローカル開発で自分のアクセスを計上しないためと、ID 無しでもビルドを通すため
 */
const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

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
        <SpeedInsights />
      </body>
      {/* ドキュメントどおり body の外に置く。ハイドレーション後に gtag.js を読む */}
      {GA_ID && <GoogleAnalytics gaId={GA_ID} />}
    </html>
  );
}
