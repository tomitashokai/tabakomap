'use client';

import BottomNav from '@/components/BottomNav';

const CHECKIN_COUNT = 7;
const NEXT_REWARD = 10;

export default function MyPage() {
  const progress = (CHECKIN_COUNT / NEXT_REWARD) * 100;

  return (
    <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, overflowY: 'auto', background: '#f5f5f5', paddingBottom: 72 }}>
        {/* Header */}
        <div style={{ background: 'white', padding: '14px 16px 12px', borderBottom: '1px solid #f0f0f0' }}>
          <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: -0.5 }}>マイページ</div>
        </div>

        {/* Profile */}
        <div style={{ background: 'white', margin: 12, borderRadius: 20, padding: 20 }}>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 16 }}>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                background: '#f0f0f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 32,
              }}
            >
              🧑
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700 }}>ゲストユーザー</div>
              <div style={{ fontSize: 13, color: '#888', marginTop: 2 }}>
                ログインして記録を保存しよう
              </div>
            </div>
          </div>
          <button
            style={{
              width: '100%',
              padding: 14,
              background: '#1a1a1a',
              color: 'white',
              border: 'none',
              borderRadius: 14,
              fontSize: 15,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            ログイン / 新規登録
          </button>
        </div>

        {/* Checkin progress */}
        <div style={{ background: 'white', margin: '0 12px 12px', borderRadius: 20, padding: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>
            🔥 チェックイン実績
          </div>
          <div style={{ fontSize: 13, color: '#888', marginBottom: 12 }}>
            あと {NEXT_REWARD - CHECKIN_COUNT} 回で広告非表示ゲット！
          </div>
          <div
            style={{
              height: 8,
              background: '#f0f0f0',
              borderRadius: 4,
              overflow: 'hidden',
              marginBottom: 8,
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${progress}%`,
                background: '#f59e0b',
                borderRadius: 4,
                transition: 'width 0.4s ease',
              }}
            />
          </div>
          <div style={{ fontSize: 12, color: '#aaa', textAlign: 'right' }}>
            {CHECKIN_COUNT} / {NEXT_REWARD} 回
          </div>
        </div>

        {/* Stats */}
        <div
          style={{
            background: 'white',
            margin: '0 12px 12px',
            borderRadius: 20,
            padding: 20,
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: 16,
          }}
        >
          <StatCell value={CHECKIN_COUNT} label="チェックイン" />
          <StatCell value={2} label="スポット投稿" />
          <StatCell value={14} label="お気に入り" />
        </div>

        {/* Menu */}
        <div style={{ background: 'white', margin: '0 12px', borderRadius: 20, overflow: 'hidden' }}>
          {[
            { icon: '❤️', label: 'お気に入りスポット' },
            { icon: '📍', label: '投稿したスポット' },
            { icon: '⚙️', label: '設定' },
            { icon: '📖', label: '利用規約' },
            { icon: '🔒', label: 'プライバシーポリシー' },
          ].map((item, i) => (
            <div
              key={item.label}
              style={{
                padding: '16px 20px',
                borderTop: i > 0 ? '1px solid #f5f5f5' : 'none',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                cursor: 'pointer',
              }}
            >
              <span style={{ fontSize: 20 }}>{item.icon}</span>
              <span style={{ fontSize: 15, fontWeight: 500 }}>{item.label}</span>
              <span style={{ marginLeft: 'auto', color: '#ccc' }}>›</span>
            </div>
          ))}
        </div>
      </div>
      <BottomNav />
    </div>
  );
}

function StatCell({ value, label }: { value: number; label: string }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 24, fontWeight: 800, color: '#f59e0b' }}>{value}</div>
      <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>{label}</div>
    </div>
  );
}
