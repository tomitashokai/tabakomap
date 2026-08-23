'use client';

import BottomNav from '@/components/BottomNav';

const TABS = ['すべて', '新銘柄', '規制', 'イベント', 'コラム'];

const MOCK_NEWS = [
  {
    id: 1,
    tag: '新銘柄',
    title: 'フィリップモリス、新フレーバーのアイコス専用スティックを発売',
    date: '2026年8月22日',
    emoji: '🆕',
    featured: true,
  },
  {
    id: 2,
    tag: '規制',
    title: '大阪府、屋外喫煙所の設置基準を改定。商業施設への義務化検討',
    date: '2026年8月20日',
    emoji: '📋',
    featured: false,
  },
  {
    id: 3,
    tag: 'イベント',
    title: '第3回 大阪シーシャフェスタ開催決定。梅田スカイビル広場にて',
    date: '2026年8月18日',
    emoji: '💨',
    featured: false,
  },
  {
    id: 4,
    tag: 'コラム',
    title: '葉巻入門：初心者が知っておくべき産地と強さの基礎知識',
    date: '2026年8月15日',
    emoji: '🍃',
    featured: false,
  },
];

export default function NewsPage() {
  const featured = MOCK_NEWS[0];
  const rest = MOCK_NEWS.slice(1);

  return (
    <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, overflowY: 'auto', background: '#f5f5f5', paddingBottom: 72 }}>
        {/* Header */}
        <div style={{ background: 'white', padding: '14px 16px 12px', borderBottom: '1px solid #f0f0f0' }}>
          <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: -0.5 }}>
            タバコ<span style={{ color: '#f59e0b' }}>ニュース</span>
          </div>
        </div>

        {/* Tabs */}
        <div
          style={{
            background: 'white',
            display: 'flex',
            padding: '0 16px',
            borderBottom: '1px solid #f0f0f0',
            overflowX: 'auto',
            scrollbarWidth: 'none',
          }}
        >
          {TABS.map((tab, i) => (
            <div
              key={tab}
              style={{
                padding: '10px 14px',
                fontSize: 13,
                fontWeight: 600,
                color: i === 0 ? '#1a1a1a' : '#aaa',
                whiteSpace: 'nowrap',
                borderBottom: i === 0 ? '2px solid #f59e0b' : '2px solid transparent',
                cursor: 'pointer',
              }}
            >
              {tab}
            </div>
          ))}
        </div>

        {/* Featured */}
        <div style={{ margin: 12, borderRadius: 16, overflow: 'hidden', background: '#1a1a1a' }}>
          <div
            style={{
              height: 160,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 64,
              background: 'linear-gradient(135deg, #2d2d2d, #111)',
            }}
          >
            {featured.emoji}
          </div>
          <div style={{ padding: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
              {featured.tag}
            </div>
            <div style={{ fontSize: 17, fontWeight: 700, color: 'white', lineHeight: 1.4, marginBottom: 6 }}>
              {featured.title}
            </div>
            <div style={{ fontSize: 12, color: '#888' }}>{featured.date}</div>
          </div>
        </div>

        {/* List */}
        <div style={{ margin: '0 12px' }}>
          {rest.map((item) => (
            <div
              key={item.id}
              style={{
                background: 'white',
                borderRadius: 14,
                padding: 14,
                marginBottom: 10,
                display: 'flex',
                gap: 12,
                cursor: 'pointer',
              }}
            >
              <div
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: 10,
                  background: '#f0f0f0',
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 32,
                }}
              >
                {item.emoji}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>
                  {item.tag}
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.4, marginBottom: 4 }}>
                  {item.title}
                </div>
                <div style={{ fontSize: 11, color: '#aaa' }}>{item.date}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
