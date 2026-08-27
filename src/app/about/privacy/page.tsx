import Link from 'next/link';
import BottomNav from '@/components/BottomNav';

export const metadata = {
  title: 'プライバシーポリシー',
  description:
    'タバコマップが利用する外部サービスと、そこへ送信される情報の内容・目的・無効化の方法を記載しています。',
  alternates: { canonical: '/about/privacy' },
};

interface Section {
  title: string;
  /** 何を送っているか。曖昧にせず、送信先と内容を1文目で言い切る */
  body: string;
  /** 利用者が自分で止められる手段。無ければ null */
  optOut: { label: string; href: string } | null;
  policy: { label: string; href: string };
}

const SECTIONS: Section[] = [
  {
    title: 'アクセス解析（Google アナリティクス 4）',
    body:
      'どのページがどれだけ見られているかを把握するため、Google アナリティクス 4 を利用しています。' +
      'Cookie を用いて閲覧されたページや参照元などの情報が Google に送信されます。' +
      '氏名・メールアドレスのように個人を直接特定できる情報は送信していません。' +
      'IP アドレスは Google 側の仕様により匿名化されます。',
    optOut: {
      label: 'Google アナリティクス オプトアウト アドオン',
      href: 'https://tools.google.com/dlpage/gaoptout',
    },
    policy: {
      label: 'Google のサービス利用における情報の使用',
      href: 'https://policies.google.com/technologies/partner-sites',
    },
  },
  {
    title: '表示速度の計測（Vercel Speed Insights）',
    body:
      'ページの表示が遅い箇所を見つけるため、実際の閲覧時の表示速度の指標を Vercel に送信しています。' +
      'Cookie は使用せず、個人を識別する情報も含みません。',
    optOut: null,
    policy: {
      label: 'Vercel Speed Insights のプライバシーについて',
      href: 'https://vercel.com/docs/speed-insights/privacy-policy',
    },
  },
  {
    title: '地図の表示（Mapbox）',
    body:
      '地図は Mapbox から配信されています。地図を表示する際、IP アドレスと表示中の地図の範囲が Mapbox に送信されます。' +
      '現在地の取得はブラウザの許可を求めたうえで行い、取得した位置情報は地図の中心を移動させるためだけに' +
      '端末内で使用します。当サイトのサーバーには保存していません。',
    optOut: null,
    policy: {
      label: 'Mapbox のプライバシーポリシー',
      href: 'https://www.mapbox.com/legal/privacy',
    },
  },
  {
    title: 'スポットの投稿とチェックイン（Supabase）',
    body:
      'スポットの登録やチェックインを記録するため、匿名の利用者識別子を発行してブラウザに保存し、' +
      'データベース（Supabase）に投稿内容とあわせて保存しています。' +
      'メールアドレスやパスワードの登録は求めておらず、取得もしていません。' +
      '投稿されたスポットの情報は、地図上で誰でも閲覧できる状態で公開されます。',
    optOut: null,
    policy: {
      label: 'Supabase のプライバシーポリシー',
      href: 'https://supabase.com/privacy',
    },
  },
];

export default function PrivacyPolicyPage() {
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
          <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: -0.5 }}>
            プライバシーポリシー
          </div>
        </div>

        <p style={{ fontSize: 13, color: '#666', lineHeight: 1.8, padding: '16px 20px 4px' }}>
          タバコマップは以下の外部サービスを利用しており、それぞれに次の情報が送信されます。
        </p>

        <div style={{ padding: '8px 12px 0' }}>
          {SECTIONS.map((s) => (
            <section
              key={s.title}
              style={{ background: 'white', borderRadius: 16, padding: 16, marginBottom: 10 }}
            >
              <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>{s.title}</h2>
              <p style={{ fontSize: 13, color: '#555', lineHeight: 1.8, marginBottom: 12 }}>
                {s.body}
              </p>
              {s.optOut && (
                <a href={s.optOut.href} target="_blank" rel="noreferrer" style={linkStyle}>
                  {s.optOut.label} ↗
                </a>
              )}
              <a href={s.policy.href} target="_blank" rel="noreferrer" style={linkStyle}>
                {s.policy.label} ↗
              </a>
            </section>
          ))}

          <section style={{ background: 'white', borderRadius: 16, padding: 16, marginBottom: 10 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>第三者への提供</h2>
            <p style={{ fontSize: 13, color: '#555', lineHeight: 1.8 }}>
              上記の各サービスへの送信を除き、収集した情報を第三者に提供することはありません。
              広告の配信や、収集した情報の販売は行っていません。
            </p>
          </section>

          <section style={{ background: 'white', borderRadius: 16, padding: 16, marginBottom: 10 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>Cookie の無効化</h2>
            <p style={{ fontSize: 13, color: '#555', lineHeight: 1.8 }}>
              ブラウザの設定から Cookie を無効にすることで、アクセス解析による収集を拒否できます。
              その場合、スポットの投稿やチェックインなど利用者を識別する機能は使えなくなります。
            </p>
          </section>

          <section style={{ background: 'white', borderRadius: 16, padding: 16, marginBottom: 10 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>本ポリシーの変更</h2>
            <p style={{ fontSize: 13, color: '#555', lineHeight: 1.8 }}>
              利用する外部サービスを追加または変更した場合は、このページを更新します。
            </p>
          </section>
        </div>

        <p style={{ fontSize: 11, color: '#999', lineHeight: 1.8, padding: '8px 20px 24px' }}>
          掲載しているデータの出典は
          <Link href="/about/data" style={{ color: '#b45309', textDecoration: 'none' }}>
            データの出典
          </Link>
          のページに記載しています。
        </p>
      </div>
      <BottomNav />
    </div>
  );
}

const linkStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 13,
  fontWeight: 600,
  color: '#b45309',
  textDecoration: 'none',
  wordBreak: 'break-all',
  marginTop: 4,
};
