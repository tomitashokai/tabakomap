import Link from 'next/link';
import BottomNav from '@/components/BottomNav';

export interface LegalSection {
  heading: string;
  paragraphs: string[];
  /** 箇条書き。段落のあとに出す */
  bullets?: string[];
}

interface Props {
  title: string;
  /** 見出し下のリード文 */
  lead: string;
  sections: LegalSection[];
  /** 「最終更新」に出す日付 */
  updatedAt: string;
}

/** 利用規約・プライバシーポリシーの共通レイアウト（/about/data と同じ体裁に揃える） */
export default function LegalPage({ title, lead, sections, updatedAt }: Props) {
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
          <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: -0.5, margin: 0 }}>{title}</h1>
        </div>

        <p style={{ fontSize: 13, color: '#666', lineHeight: 1.8, padding: '16px 20px 4px' }}>
          {lead}
        </p>

        <div style={{ padding: '8px 12px 0' }}>
          {sections.map((s) => (
            <section
              key={s.heading}
              style={{ background: 'white', borderRadius: 16, padding: 16, marginBottom: 10 }}
            >
              <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>{s.heading}</h2>
              {s.paragraphs.map((p) => (
                <p key={p} style={{ fontSize: 13, color: '#555', lineHeight: 1.8, marginBottom: 8 }}>
                  {p}
                </p>
              ))}
              {s.bullets && (
                <ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>
                  {s.bullets.map((b) => (
                    <li
                      key={b}
                      style={{ fontSize: 13, color: '#555', lineHeight: 1.8, marginBottom: 4 }}
                    >
                      {b}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>

        <p style={{ fontSize: 11, color: '#999', lineHeight: 1.8, padding: '8px 20px 24px' }}>
          最終更新：{updatedAt}
        </p>
      </div>
      <BottomNav />
    </div>
  );
}
