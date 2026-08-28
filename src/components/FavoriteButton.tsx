'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { addFavorite, isFavorite, removeFavorite } from '@/lib/favorites';

/**
 * overlay: マップの詳細シートのヒーロー上。写真の上に載るので白抜きの丸
 * outline: /spots/[id] の本文中。周りが白なので枠線つきの横長ボタン
 */
type Variant = 'overlay' | 'outline';

interface Props {
  spotId: string;
  variant: Variant;
}

/**
 * お気に入りのトグル。
 *
 * 楽観更新する。DB の往復を待ってから★を塗ると、電波の悪い場所で
 * 押しても何も起きないように見えて連打され、余計に遅くなる。
 * 失敗したら見た目を戻して理由を出す。
 *
 * /spots/[id] は revalidate 付きのサーバーコンポーネントなので、
 * このボタンだけをクライアントに切り出してページの静的性を保っている。
 */
export default function FavoriteButton({ spotId, variant }: Props) {
  const { user, loading: authLoading } = useAuth();
  const [saved, setSaved] = useState(false);
  /** 現在の状態をまだ DB に問い合わせていない。☆ で確定表示しないための区別 */
  const [known, setKnown] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let active = true;

    isFavorite(spotId, user.id).then((v) => {
      if (!active) return;
      setSaved(v);
      setKnown(true);
    });

    return () => {
      active = false;
    };
  }, [spotId, user]);

  const handleClick = async () => {
    if (!user || busy) return;

    const next = !saved;
    setSaved(next);
    setBusy(true);
    setError(null);

    const ok = next ? await addFavorite(spotId, user.id) : await removeFavorite(spotId, user.id);

    if (!ok) {
      setSaved(!next);
      setError(next ? '保存できませんでした' : '解除できませんでした');
    }
    setBusy(false);
  };

  const disabled = authLoading || !user || !known || busy;
  const label = saved ? 'お気に入りから外す' : 'お気に入りに追加';

  return (
    <div style={{ position: 'relative', display: variant === 'outline' ? 'block' : 'inline-block' }}>
      <button
        onClick={handleClick}
        disabled={disabled}
        aria-label={label}
        aria-pressed={saved}
        style={variant === 'overlay' ? overlayStyle(saved, disabled) : outlineStyle(saved, disabled)}
      >
        {variant === 'overlay' ? (
          saved ? '★' : '☆'
        ) : (
          <>
            <span style={{ fontSize: 16 }}>{saved ? '★' : '☆'}</span>
            <span>{saved ? 'お気に入りに保存済み' : 'お気に入りに保存'}</span>
          </>
        )}
      </button>
      {error && (
        <div
          style={
            variant === 'overlay'
              ? {
                  // ヒーローの高さを変えないよう浮かせる。右端に合わせて画面外に出さない
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: 6,
                  whiteSpace: 'nowrap',
                  background: 'rgba(0,0,0,0.75)',
                  color: 'white',
                  borderRadius: 8,
                  padding: '4px 8px',
                  fontSize: 11,
                }
              : { fontSize: 12, color: '#ef4444', marginTop: 6 }
          }
        >
          {error}
        </div>
      )}
    </div>
  );
}

function overlayStyle(saved: boolean, disabled: boolean): React.CSSProperties {
  return {
    width: 38,
    height: 38,
    borderRadius: '50%',
    border: 'none',
    background: 'rgba(255,255,255,0.2)',
    backdropFilter: 'blur(4px)',
    color: saved ? '#f59e0b' : 'white',
    fontSize: 20,
    lineHeight: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: disabled ? 'default' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    padding: 0,
  };
}

function outlineStyle(saved: boolean, disabled: boolean): React.CSSProperties {
  return {
    width: '100%',
    padding: '12px 16px',
    borderRadius: 14,
    border: `1.5px solid ${saved ? '#fde68a' : '#f0f0f0'}`,
    background: saved ? '#fffbeb' : 'white',
    color: saved ? '#92400e' : '#1a1a1a',
    fontSize: 14,
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    cursor: disabled ? 'default' : 'pointer',
    opacity: disabled ? 0.6 : 1,
  };
}
