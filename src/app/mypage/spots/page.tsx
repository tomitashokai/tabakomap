'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import BottomNav from '@/components/BottomNav';
import { useAuth } from '@/components/AuthProvider';
import { fetchSpotsByUser, deleteSpot } from '@/lib/spots';
import { Spot, SPOT_TYPE_LABELS, SPOT_TYPE_EMOJIS } from '@/lib/types';

export default function MySpotsPage() {
  const { user, loading: authLoading } = useAuth();
  const [spots, setSpots] = useState<Spot[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let active = true;

    fetchSpotsByUser(user.id).then((list) => {
      if (!active) return;
      setSpots(list);
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [user]);

  const handleDelete = async (spot: Spot) => {
    if (!confirm(`「${spot.name}」を取り下げますか？`)) return;
    setDeleting(spot.id);
    const ok = await deleteSpot(spot.id);
    setDeleting(null);
    if (ok) {
      setSpots((prev) => prev.filter((s) => s.id !== spot.id));
    } else {
      alert('取り下げに失敗しました');
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
          <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: -0.5 }}>投稿したスポット</div>
        </div>

        {busy ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#aaa', fontSize: 14 }}>
            読み込み中…
          </div>
        ) : spots.length === 0 ? (
          <div style={{ padding: '48px 32px', textAlign: 'center', color: '#aaa' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📍</div>
            <div style={{ fontSize: 14, marginBottom: 20, lineHeight: 1.7 }}>
              まだ投稿したスポットがありません。
              <br />
              マップの「＋」から喫煙所を追加できます。
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
              {spots.length} 件を投稿しています
            </div>
            {spots.map((spot) => (
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
                    {SPOT_TYPE_LABELS[spot.type]}・{formatDate(spot.created_at)}
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {spot.is_outdoor && <span style={tagStyle}>屋外</span>}
                    {spot.is_heated && <span style={tagStyle}>加熱式OK</span>}
                    {spot.is_24h && <span style={tagStyle}>24時間</span>}
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(spot)}
                  disabled={deleting === spot.id}
                  style={{
                    flexShrink: 0,
                    padding: '8px 12px',
                    borderRadius: 10,
                    border: '1.5px solid #f0f0f0',
                    background: 'white',
                    color: deleting === spot.id ? '#ccc' : '#ef4444',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: deleting === spot.id ? 'default' : 'pointer',
                  }}
                >
                  {deleting === spot.id ? '…' : '取り下げ'}
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
