'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import BottomNav from '@/components/BottomNav';
import { useAuth } from '@/components/AuthProvider';
import { fetchUserCheckinStats, type CheckinStats } from '@/lib/checkins';
import { fetchSpotsByUser } from '@/lib/spots';

const EMPTY_STATS: CheckinStats = { total: 0, spots: 0, thisMonth: 0 };

/**
 * href の無い項目は未実装。矢印つきで押せるように見せて無反応だと、
 * 壊れているのか自分の操作ミスか分からないので「準備中」と出して押せない見た目にする
 */
const MENU: { icon: string; label: string; href?: string }[] = [
  { icon: '❤️', label: 'お気に入りスポット' },
  { icon: '📍', label: '投稿したスポット', href: '/mypage/spots' },
  { icon: '⚙️', label: '設定' },
  { icon: '📚', label: 'データの出典', href: '/about/data' },
  { icon: '📖', label: '利用規約', href: '/about/terms' },
  { icon: '🔒', label: 'プライバシーポリシー', href: '/about/privacy' },
];

export default function MyPage() {
  const { user, loading: authLoading, isAnonymous } = useAuth();
  const [stats, setStats] = useState<CheckinStats>(EMPTY_STATS);
  const [postedCount, setPostedCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let active = true;

    fetchUserCheckinStats(user.id).then((s) => {
      if (!active) return;
      setStats(s);
      setLoading(false);
    });

    fetchSpotsByUser(user.id).then((list) => {
      if (!active) return;
      setPostedCount(list.length);
    });

    return () => {
      active = false;
    };
  }, [user]);

  // 次のマイルストーンは 10 回刻み
  const goal = (Math.floor(stats.total / 10) + 1) * 10;
  const progress = (stats.total / goal) * 100;
  const busy = authLoading || loading;

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
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 18, fontWeight: 700 }}>
                {isAnonymous || !user ? 'ゲストユーザー' : (user.email ?? 'ユーザー')}
              </div>
              <div style={{ fontSize: 13, color: '#888', marginTop: 2 }}>
                {user ? `ID: ${user.id.slice(0, 8)}` : '接続中…'}
              </div>
            </div>
          </div>
          <div
            style={{
              background: '#f9f9f9',
              borderRadius: 12,
              padding: '12px 14px',
              fontSize: 12,
              color: '#888',
              lineHeight: 1.6,
            }}
          >
            記録はこのブラウザに紐づいて保存されています。
            <br />
            メール登録による他端末との同期は準備中です。
          </div>
        </div>

        {/* Checkin progress */}
        <div style={{ background: 'white', margin: '0 12px 12px', borderRadius: 20, padding: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>🔥 チェックイン実績</div>
          <div style={{ fontSize: 13, color: '#888', marginBottom: 12 }}>
            {busy ? '読み込み中…' : `あと ${goal - stats.total} 回で次のバッジを獲得！`}
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
            {/* 角丸は親の overflow:hidden に任せ、レイアウトを起こさない transform で伸縮させる */}
            <div
              style={{
                height: '100%',
                background: '#f59e0b',
                transformOrigin: 'left',
                transform: `scaleX(${busy ? 0 : progress / 100})`,
                transition: 'transform 0.4s ease',
              }}
            />
          </div>
          <div style={{ fontSize: 12, color: '#aaa', textAlign: 'right' }}>
            {stats.total} / {goal} 回
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
          <StatCell value={stats.total} label="チェックイン" busy={busy} />
          <StatCell value={stats.spots} label="訪問スポット" busy={busy} />
          <StatCell value={stats.thisMonth} label="今月" busy={busy} />
        </div>

        {/* Menu */}
        <div style={{ background: 'white', margin: '0 12px', borderRadius: 20, overflow: 'hidden' }}>
          {MENU.map((item, i) => {
            const row = (
              <>
                <span style={{ fontSize: 20, opacity: item.href ? 1 : 0.4 }}>{item.icon}</span>
                <span style={{ fontSize: 15, fontWeight: 500, color: item.href ? 'inherit' : '#aaa' }}>
                  {item.label}
                </span>
                {item.label === '投稿したスポット' && postedCount > 0 && (
                  <span style={{ fontSize: 13, color: '#888', marginLeft: 6 }}>{postedCount}</span>
                )}
                {item.href ? (
                  <span style={{ marginLeft: 'auto', color: '#ccc' }}>›</span>
                ) : (
                  <span
                    style={{
                      marginLeft: 'auto',
                      fontSize: 11,
                      color: '#aaa',
                      background: '#f5f5f5',
                      borderRadius: 10,
                      padding: '3px 8px',
                    }}
                  >
                    準備中
                  </span>
                )}
              </>
            );
            const style: React.CSSProperties = {
              padding: '16px 20px',
              borderTop: i > 0 ? '1px solid #f5f5f5' : 'none',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              cursor: item.href ? 'pointer' : 'default',
              color: 'inherit',
              textDecoration: 'none',
            };
            return item.href ? (
              <Link key={item.label} href={item.href} style={style}>
                {row}
              </Link>
            ) : (
              <div key={item.label} style={style}>
                {row}
              </div>
            );
          })}
        </div>
      </div>
      <BottomNav />
    </div>
  );
}

function StatCell({ value, label, busy }: { value: number; label: string; busy: boolean }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 24, fontWeight: 800, color: '#f59e0b' }}>{busy ? '–' : value}</div>
      <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>{label}</div>
    </div>
  );
}
