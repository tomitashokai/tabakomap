import type { Metadata } from 'next';
import LegalPage, { type LegalSection } from '@/components/LegalPage';

export const metadata: Metadata = {
  title: 'プライバシーポリシー',
  description:
    'タバコマップが取得する情報（位置情報・匿名ID・アクセス解析）と、その利用目的・保存先についての説明です。',
  alternates: { canonical: '/about/privacy' },
};

const SECTIONS: LegalSection[] = [
  {
    heading: '位置情報',
    paragraphs: [
      '「現在地」ボタンを押したときにかぎり、ブラウザの位置情報を取得します。取得した現在地は地図の表示位置を合わせるために使うもので、サーバーには送信も保存もしていません。',
      'スポットを登録したときだけ、その地点の緯度経度が投稿内容としてデータベースに保存されます。これは登録した場所の座標であり、その後の移動履歴を記録するものではありません。',
    ],
  },
  {
    heading: '利用者の識別',
    paragraphs: [
      'チェックインや投稿したスポットをご自身のものとして扱うため、端末ごとに匿名の利用者 ID を発行しています（Supabase の匿名認証）。',
      '氏名・メールアドレス・電話番号などは取得していません。ID はブラウザに保存されるため、ブラウザのデータを消去したり別の端末から利用したりすると、以前の記録とは結びつかなくなります。',
    ],
  },
  {
    heading: 'アクセス解析',
    paragraphs: [
      'サイトの利用状況と表示速度を把握するために Vercel Analytics および Vercel Speed Insights を利用しています。閲覧されたページや読み込み時間などが集計されますが、個人を特定する情報は含まれません。',
    ],
  },
  {
    heading: '広告',
    paragraphs: [
      '現在、第三者の広告配信サービスは利用していません。今後導入する場合は、配信事業者と取り扱う情報をこのページに追記したうえで開始します。',
    ],
  },
  {
    heading: 'データの保存先',
    paragraphs: [
      'スポットや チェックインのデータは Supabase に、サイト自体は Vercel にホスティングされています。地図の表示には Mapbox を利用しており、地図タイルの取得にともない通信が発生します。',
    ],
  },
  {
    heading: '第三者への提供',
    paragraphs: [
      '法令に基づく開示請求を受けた場合を除き、保存している情報を第三者へ提供・販売することはありません。',
    ],
  },
  {
    heading: '投稿の削除',
    paragraphs: [
      'ご自身で登録したスポットは、マイページの「投稿したスポット」からいつでも削除できます。運営が取り込んだ公開データは削除の対象外です。',
    ],
  },
  {
    heading: 'お問い合わせ',
    paragraphs: [
      'このポリシーに関するお問い合わせ窓口は準備中です。整い次第この項目に掲載します。',
    ],
  },
];

export default function PrivacyPage() {
  return (
    <LegalPage
      title="プライバシーポリシー"
      lead="タバコマップ（以下「本サービス」）が取得する情報と、その使いみちについて説明します。"
      sections={SECTIONS}
      updatedAt="2026年8月30日"
    />
  );
}
