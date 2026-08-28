import Link from 'next/link';
import BottomNav from '@/components/BottomNav';

export const metadata = {
  title: '利用規約',
  description:
    'タバコマップの利用条件です。掲載情報の免責、スポット投稿の取り扱い、禁止事項を記載しています。',
  alternates: { canonical: '/about/terms' },
};

interface Article {
  title: string;
  /** 段落ごとに分ける。1つの section に詰め込むと読み飛ばされる */
  paragraphs: string[];
}

const ARTICLES: Article[] = [
  {
    title: 'このサービスについて',
    paragraphs: [
      'タバコマップは、喫煙所と喫煙可能店の場所、たばこ銘柄の情報をまとめて無償で提供するサービスです。' +
        '掲載しているデータは公開情報の取り込みと利用者の投稿によるもので、正確性・完全性・最新性を保証するものではありません。',
    ],
  },
  {
    title: '20歳未満の方へ',
    paragraphs: [
      '日本では20歳未満の方の喫煙は法律で禁止されています。本サービスは喫煙を勧めるものではなく、' +
        '喫煙する場所を探している方が、吸ってよい場所を確実に選べるようにするためのものです。',
    ],
  },
  {
    title: '掲載情報について',
    paragraphs: [
      '喫煙の可否・営業時間・利用条件は予告なく変わります。**現地の掲示と施設の指示が常に優先します。**' +
        '本サービスの表示を理由に喫煙してトラブルが生じた場合、運営者は責任を負いません。',
      '喫煙所の外であっても、自治体の路上喫煙禁止区域では喫煙できません。' +
        'お出かけ先の条例をあわせてご確認ください。',
    ],
  },
  {
    title: 'スポットの投稿',
    paragraphs: [
      '投稿されたスポットは、地図上で誰でも閲覧できる状態で公開されます。' +
        '実在しない場所、喫煙が認められていない場所、第三者の権利を侵害する内容は投稿しないでください。',
      '投稿された内容は、本サービスでの掲載・編集・削除を行うために利用します。' +
        '掲載が適当でないと判断した投稿は、予告なく修正または削除することがあります。',
    ],
  },
  {
    title: '禁止事項',
    paragraphs: [
      '次の行為はご遠慮ください。法令または公序良俗に反する行為、施設や他の利用者に迷惑をかける行為、' +
        '虚偽の情報を投稿する行為、本サービスの運営を妨げる行為、自動化された手段による大量のアクセスやデータの取得。',
      '掲載データの出典元にはそれぞれ利用条件があります。転載や再配布を行う場合は、' +
        'データの出典のページに記載した各出典元の条件に従ってください。',
    ],
  },
  {
    title: 'サービスの変更・中断・終了',
    paragraphs: [
      '運営者は、予告なく本サービスの内容を変更し、また提供を中断・終了することがあります。' +
        'これにより生じた損害について、運営者は責任を負いません。',
    ],
  },
  {
    title: '本規約の変更',
    paragraphs: ['本規約を変更した場合は、このページを更新します。'],
  },
  {
    title: '準拠法',
    paragraphs: ['本規約は日本法に準拠して解釈されます。'],
  },
];

/** `**強調**` だけを太字にする。規約の要になる1文を沈ませないための最小限の記法 */
function renderEmphasis(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/).map((part, i) =>
    part.startsWith('**') && part.endsWith('**') ? (
      <strong key={i} style={{ color: '#1a1a1a' }}>
        {part.slice(2, -2)}
      </strong>
    ) : (
      part
    )
  );
}

export default function TermsPage() {
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
          <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: -0.5 }}>利用規約</div>
        </div>

        <p style={{ fontSize: 13, color: '#666', lineHeight: 1.8, padding: '16px 20px 4px' }}>
          タバコマップをご利用いただく際の条件です。ご利用の時点で、本規約に同意いただいたものとします。
        </p>

        <div style={{ padding: '8px 12px 0' }}>
          {ARTICLES.map((a) => (
            <section
              key={a.title}
              style={{ background: 'white', borderRadius: 16, padding: 16, marginBottom: 10 }}
            >
              <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>{a.title}</h2>
              {a.paragraphs.map((p, i) => (
                <p
                  key={i}
                  style={{
                    fontSize: 13,
                    color: '#555',
                    lineHeight: 1.8,
                    marginBottom: i === a.paragraphs.length - 1 ? 0 : 10,
                  }}
                >
                  {renderEmphasis(p)}
                </p>
              ))}
            </section>
          ))}
        </div>

        <p style={{ fontSize: 11, color: '#999', lineHeight: 1.8, padding: '8px 20px 24px' }}>
          外部サービスへ送信される情報は
          <Link href="/about/privacy" style={{ color: '#b45309', textDecoration: 'none' }}>
            プライバシーポリシー
          </Link>
          、掲載データの出典は
          <Link href="/about/data" style={{ color: '#b45309', textDecoration: 'none' }}>
            データの出典
          </Link>
          に記載しています。
        </p>
      </div>
      <BottomNav />
    </div>
  );
}
