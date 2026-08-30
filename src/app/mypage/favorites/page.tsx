'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import BottomNav from '@/components/BottomNav';
import { useAuth } from '@/components/AuthProvider';
import { fetchFavoriteSpots, removeFavorite } from '@/lib/favorites';
import { Spot, SPOT_TYPE_LABELS, SPOT_TYPE_EMOJIS, isOpenToAll } from '@/lib/types';

export default function FavoritesPage() {
  const { user, loading: authLoading } = useAuth();
  const [spots, setSpots] = useState<Spot[]>([]);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let active = true;

    fetchFavoriteSpots(user.id).then((list) => {
      if (!active) return;
      setSpots(list);
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [user]);

  const handleRemove = async (spotId: string) => {
    if (!user || removing) return;
    setRemoving(spotId);
    const ok = await removeFavorite(spotId, user.id);
    if (ok) setSpots((prev) => prev.filter((s) => s.id !== spotId));
    setRemoving(null);
  };

  const busy = authLoading || (loading && !!user);

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
          <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: -0.5, margin: 0 }}>
            お気に入りスポット
          </h1>
        </div>

        {busy ? (
          <p style={{ fontSize: 13, color: '#aaa', padding: '24px 20px' }}>読み込み中…</p>
        ) : spots.length === 0 ? (
          <div style={{ padding: '32px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🤍</div>
            <p style={{ fontSize: 14, color: '#888', lineHeight: 1.8, marginBottom: 20 }}>
              まだお気に入りがありません。
              <br />
              スポットの詳細を開いて、右上のハートから登録できます。
            </p>
            <Link
              href="/map"
              style={{
                display: 'inline-block',
                padding: '12px 24px',
                background: '#f59e0b',
                color: '#1a1a1a',
                borderRadius: 14,
                fontSize: 14,
                fontWeight: 700,
                textDecoration: 'none',
              }}
            >
              🗺 マップで探す
            </Link>
          </div>
        ) : (
          <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {spots.map((spot) => {
              const restricted = !!spot.usage_condition && !isOpenToAll(spot);
              return (
                <div
                  key={spot.id}
                  style={{
                    background: 'white',
                    borderRadius: 14,
                    padding: '12px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                  }}
                >
                  <Link
                    href={`/spots/${spot.id}`}
                    style={{
                      flex: 1,
                      minWidth: 0,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      textDecoration: 'none',
                      color: '#1a1a1a',
                    }}
                  >
                    <span style={{ fontSize: 22, flexShrink: 0 }}>{SPOT_TYPE_EMOJIS[spot.type]}</span>
                    <span style={{ minWidth: 0 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, display: 'block' }}>
                        {spot.name}
                      </span>
                      <span style={{ fontSize: 12, color: '#aaa' }}>
                        {SPOT_TYPE_LABELS[spot.type]}
                        {restricted && spot.usage_condition ? ` ・ ⚠️ ${spot.usage_condition}` : ''}
                      </span>
                    </span>
                  </Link>
                  <button
                    onClick={() => handleRemove(spot.id)}
                    disabled={removing === spot.id}
                    aria-label={`${spot.name} をお気に入りから外す`}
                    style={{
                      flexShrink: 0,
                      background: 'none',
                      border: 'none',
                      fontSize: 18,
                      cursor: removing === spot.id ? 'default' : 'pointer',
                      opacity: removing === spot.id ? 0.4 : 1,
                    }}
                  >
                    ❤️
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
