'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import BottomNav from '@/components/BottomNav';
import { useAuth } from '@/components/AuthProvider';
import { fetchFavoriteSpots, removeFavorite, type FavoriteSpot } from '@/lib/favorites';
import { SPOT_TYPE_LABELS, SPOT_TYPE_EMOJIS, isOpenToAll } from '@/lib/types';

export default function FavoritesPage() {
  const { user, loading: authLoading } = useAuth();
  const [items, setItems] = useState<FavoriteSpot[]>([]);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let active = true;

    fetchFavoriteSpots(user.id).then((list) => {
      if (!active) return;
      setItems(list);
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [user]);

  /**
   * 解除。投稿の取り下げと違って確認は挟まない。もう一度★を押せば戻せるので、
   * 取り返しがつかない操作ではない
   */
  const handleRemove = async (spotId: string) => {
    if (!user) return;
    setRemoving(spotId);
    const ok = await removeFavorite(spotId, user.id);
    setRemoving(null);
    if (ok) {
      setItems((prev) => prev.filter((f) => f.spot.id !== spotId));
    } else {
      alert('解除に失敗しました');
    }
  };

  const busy = authLoading || loading;

  return (
    <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, overflowY: 'auto', background: '#f5f5f5', paddingBottom: 72 }}>
        {/* Header */}
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
          <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: -0.5 }}>お気に入りスポット</div>
        </div>

        {busy ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#aaa', fontSize: 14 }}>
            読み込み中…
          </div>
        ) : items.length === 0 ? (
          <div style={{ padding: '48px 32px', textAlign: 'center', color: '#aaa' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>★</div>
            <div style={{ fontSize: 14, marginBottom: 20, lineHeight: 1.7 }}>
              まだお気に入りがありません。
              <br />
              マップでピンを開き、右上の ☆ を押すと保存できます。
            </div>
            <Link
              href="/map"
              style={{
                display: 'inline-block',
                padding: '12px 24px',
                background: '#1a1a1a',
                color: 'white',
                borderRadius: 14,
                fontSize: 14,
                fontWeight: 700,
                textDecoration: 'none',
              }}
            >
              マップを開く
            </Link>
          </div>
        ) : (
          <div style={{ padding: '12px 12px 0' }}>
            <div style={{ fontSize: 12, color: '#888', margin: '0 4px 10px' }}>
              {items.length} 件を保存しています
            </div>
            {items.map(({ spot, savedAt }) => (
              <div
                key={spot.id}
                style={{
                  background: 'white',
                  borderRadius: 16,
                  padding: 14,
                  marginBottom: 10,
                  display: 'flex',
                  gap: 12,
                  alignItems: 'center',
                }}
              >
                <Link
                  href={`/spots/${spot.id}`}
                  style={{
                    display: 'flex',
                    gap: 12,
                    alignItems: 'center',
                    flex: 1,
                    minWidth: 0,
                    color: 'inherit',
                    textDecoration: 'none',
                  }}
                >
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 14,
                      background: '#f0f0f0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 24,
                      flexShrink: 0,
                    }}
                  >
                    {SPOT_TYPE_EMOJIS[spot.type]}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 15,
                        fontWeight: 700,
                        marginBottom: 3,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {spot.name}
                    </div>
                    <div style={{ fontSize: 12, color: '#888', marginBottom: 6 }}>
                      {SPOT_TYPE_LABELS[spot.type]}・{formatDate(savedAt)} に保存
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {/* 入れる人の制限は保存したあとも伝える。行ってから入れないと分かるのが一番困る */}
                      {!isOpenToAll(spot) && (
                        <span style={warnTagStyle}>⚠️ {spot.usage_condition}</span>
                      )}
                      {spot.is_outdoor && <span style={tagStyle}>屋外</span>}
                      {spot.is_heated && <span style={tagStyle}>加熱式OK</span>}
                      {spot.is_24h && <span style={tagStyle}>24時間</span>}
                    </div>
                  </div>
                </Link>
                <button
                  onClick={() => handleRemove(spot.id)}
                  disabled={removing === spot.id}
                  aria-label={`${spot.name}をお気に入りから外す`}
                  style={{
                    flexShrink: 0,
                    padding: '8px 12px',
                    borderRadius: 10,
                    border: '1.5px solid #f0f0f0',
                    background: 'white',
                    color: removing === spot.id ? '#ccc' : '#888',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: removing === spot.id ? 'default' : 'pointer',
                  }}
                >
                  {removing === spot.id ? '…' : '解除'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
}

const tagStyle: React.CSSProperties = {
  fontSize: 11,
  padding: '2px 8px',
  borderRadius: 6,
  background: '#f0f0f0',
  color: '#555',
  fontWeight: 600,
};

const warnTagStyle: React.CSSProperties = {
  ...tagStyle,
  background: '#fef3c7',
  color: '#92400e',
};
