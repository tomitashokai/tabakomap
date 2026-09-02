import Link from 'next/link';
import BottomNav from '@/components/BottomNav';

export const metadata = {
  title: 'データの出典',
  description: 'タバコマップが掲載している喫煙所・地図・銘柄データの出典元と利用条件を明示しています。',
  alternates: { canonical: '/about/data' },
};

interface Source {
  title: string;
  body: string;
  credit: string;
  href: string;
  license: string;
}

const SOURCES: Source[] = [
  {
    title: '喫煙所・喫煙可能店',
    body:
      '大阪市が公表している「大阪市指定喫煙所」と「情報提供喫煙所」を取り込んでいます。' +
      '情報提供喫煙所には店舗利用者向けの喫煙室が含まれるため、利用条件をあわせて表示しています。',
    credit: '出典：大阪市ホームページ',
    href: 'https://www.city.osaka.lg.jp/kankyo/page/0000607135.html',
    license: '政府標準利用規約に準拠（出典明示のうえ複製・翻案・商用利用が可能）',
  },
  {
    title: '地図',
    body: '地図の描画と地名データです。',
    credit: '© Mapbox / © OpenStreetMap contributors',
    href: 'https://www.mapbox.com/about/maps/',
    license: 'Mapbox 及び OpenStreetMap の利用条件に従います',
  },
  {
    title: 'ニュース',
    body: 'たばこ関連のニュース記事の見出しと配信元を表示しています。本文は配信元でご覧ください。',
    credit: 'Google ニュース RSS',
    href: 'https://news.google.com/',
    license: '各記事の著作権は配信元に帰属します',
  },
  {
    title: '銘柄データ',
    body:
      'JT・フィリップモリスジャパン・BATジャパン各社の公開情報をもとに作成しています。' +
      'タール・ニコチン量は各社の公開値です。価格は改定される場合があり、裏付けが取れなかったものは空欄にしています。',
    credit: '各メーカーの公開情報をもとに作成',
    href: 'https://www.jti.co.jp/tobacco/products/',
    license: '内容の正確性を保証するものではありません',
  },
  {
    title: '銘柄の小売定価',
    body:
      'JT の製品ページ、フィリップモリスジャパンおよび BAT ジャパンのプレスリリースで' +
      '現物を確認できた銘柄には、出典と確認日を添えて小売定価を表示しています。' +
      '確認が取れていない価格は「参考」と明記しており、銘柄名や規格が現行品と異なる場合があります。' +
      'BAT ジャパンの紙巻きたばこは公式の定価表が公開されていないため未確認です。' +
      '加熱式たばこは 2026年10月1日に改定が予定されています。',
    credit: '出典：JT 製品情報 / フィリップモリスジャパン・BAT ジャパン プレスリリース',
    href: 'https://www.pmi.com/markets/japan/ja/',
    license: '各社の公表値を引用しています',
  },
];

export default function DataSourcesPage() {
  return (
    <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, overflowY: 'auto', background: '#f5f5f5', paddingBottom: 72 }}>
        <div
          style={{
            background: 'white',
            padding: '14px 16px 12px',
            borderBottom: '1px solid #f0f0f0',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <Link
            href="/mypage"
            aria-label="マイページへ戻る"
            style={{ fontSize: 22, color: '#888', textDecoration: 'none', lineHeight: 1 }}
          >
            ‹
          </Link>
          <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: -0.5 }}>データの出典</div>
        </div>

        <p style={{ fontSize: 13, color: '#666', lineHeight: 1.8, padding: '16px 20px 4px' }}>
          タバコマップは以下のデータを利用しています。
        </p>

        <div style={{ padding: '8px 12px 0' }}>
          {SOURCES.map((s) => (
            <section
              key={s.title}
              style={{ background: 'white', borderRadius: 16, padding: 16, marginBottom: 10 }}
            >
              <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>{s.title}</h2>
              <p style={{ fontSize: 13, color: '#555', lineHeight: 1.8, marginBottom: 12 }}>
                {s.body}
              </p>
              <a
                href={s.href}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: 'inline-block',
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#b45309',
                  textDecoration: 'none',
                  wordBreak: 'break-all',
                }}
              >
                {s.credit} ↗
              </a>
              <p style={{ fontSize: 11, color: '#999', lineHeight: 1.7, marginTop: 8 }}>
                {s.license}
              </p>
            </section>
          ))}
        </div>

        <p style={{ fontSize: 11, color: '#999', lineHeight: 1.8, padding: '8px 20px 24px' }}>
          掲載情報は取り込み時点のものです。営業時間や喫煙可否は変更されることがあるため、
          お出かけ前に施設へご確認ください。
        </p>
      </div>
      <BottomNav />
    </div>
  );
}
