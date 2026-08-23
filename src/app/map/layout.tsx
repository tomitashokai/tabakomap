import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '大阪の喫煙所マップ',
  description:
    '大阪市内の喫煙所・喫煙可能なカフェ/バー/飲食店を地図で検索。利用条件（店舗利用者のみ・加熱式専用など）つきで表示するので、行っても吸えないという失敗がありません。',
  alternates: { canonical: '/map' },
};

export default function MapLayout({ children }: { children: React.ReactNode }) {
  return children;
}
