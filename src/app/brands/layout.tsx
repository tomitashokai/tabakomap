import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '銘柄データベース',
  description: '紙巻き・加熱式・シーシャ・葉巻まで、たばこ銘柄をタール/ニコチン量・価格・取扱状況つきで検索できます。',
  alternates: { canonical: '/brands' },
};

export default function BrandsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
