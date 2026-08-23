'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Spot, SpotType, SPOT_TYPE_LABELS, SPOT_TYPE_EMOJIS } from '@/lib/types';
import { useAuth } from '@/components/AuthProvider';
import { createCheckin, fetchSpotCheckinCount, hasCheckedInToday } from '@/lib/checkins';

interface Props {
  spot: Spot;
  onClose: () => void;
}

export default function SpotDetailSheet({ spot, onClose }: Props) {
  const { user, loading: authLoading } = useAuth();
  const [checkinDone, setCheckinDone] = useState(false);
  const [count, setCount] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    fetchSpotCheckinCount(spot.id).then((c) => {
      if (active) setCount(c);
    });

    if (user) {
      hasCheckedInToday(spot.id, user.id).then((done) => {
        if (active) setCheckinDone(done);
      });
    }

    return () => {
      active = false;
    };
  }, [spot.id, user]);

  const handleCheckin = async () => {
    if (!user || saving || checkinDone) return;
    setSaving(true);
    setError(null);

    const ok = await createCheckin(spot.id, user.id);
    if (ok) {
      setCheckinDone(true);
      setCount((c) => (c ?? 0) + 1);
    } else {
      setError('チェックインに失敗しました。通信環境を確認してください。');
    }
    setSaving(false);
  };

  const buttonDisabled = authLoading || !user || saving || checkinDone;

  const cond = spot.usage_condition;
  /** 「特になし」以外の条件がついている＝誰でも自由に使えるわけではない */
  const restricted = !!cond && !/^特になし$/.test(cond);

  // 加熱式は「不可」と「不明」を区別する。インポートしたスポットの多くは記載が無いだけで、
  // 吸えないわけではない
  const heatedLabel = /加熱式専用/.test(cond ?? '')
    ? '加熱式のみ'
    : spot.is_heated
      ? '✅ 可'
      : spot.created_by
        ? '❌ 不可'
        : '不明';

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        background: 'rgba(0,0,0,0.4)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'white',
          borderRadius: '24px 24px 0 0',
          maxHeight: '85dvh',
          display: 'flex',
          flexDirection: 'column',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        {/* Handle */}
        <div
          style={{
            width: 36,
            height: 4,
            background: '#e0e0e0',
            borderRadius: 2,
            margin: '10px auto',
            flexShrink: 0,
          }}
        />

        {/* Hero */}
        <div
          style={{
            height: 140,
            background: 'linear-gradient(135deg, #2d2d2d, #1a1a1a)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 52,
            position: 'relative',
            flexShrink: 0,
          }}
        >
          {SPOT_TYPE_EMOJIS[spot.type as SpotType]}
          <div style={{ position: 'absolute', bottom: 12, left: 16, right: 16 }}>
            <div style={{ color: 'white', fontSize: 18, fontWeight: 700, marginBottom: 6 }}>
              {spot.name}
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <span style={badgeStyle}>{SPOT_TYPE_LABELS[spot.type as SpotType]}</span>
              {/* 誰でも入れる場所と取り違えると無駄足になるので、条件つきは目立たせる */}
              {restricted && <span style={warnBadgeStyle}>⚠️ {spot.usage_condition}</span>}
              {spot.is_outdoor && <span style={badgeStyle}>屋外</span>}
              {spot.is_heated && <span style={badgeStyle}>加熱式OK</span>}
              {spot.is_24h && <span style={badgeStyle}>24時間</span>}
            </div>
          </div>
        </div>

        {/* Scrollable body */}
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {/* Check-in */}
          <div style={{ padding: 16 }}>
            <div
              style={{
                background: '#fffbeb',
                border: '1.5px solid #fde68a',
                borderRadius: 14,
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>
                  {checkinDone ? '✅ 今日はチェックイン済み！' : '🔥 ここで吸った？'}
                </div>
                <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
                  {count === null
                    ? 'チェックインで情報を更新'
                    : count === 0
                      ? 'まだ誰もチェックインしていません'
                      : `これまでに ${count} 回チェックイン`}
                </div>
              </div>
              <button
                onClick={handleCheckin}
                disabled={buttonDisabled}
                style={{
                  background: buttonDisabled ? '#d1d5db' : '#f59e0b',
                  color: '#1a1a1a',
                  border: 'none',
                  padding: '10px 18px',
                  borderRadius: 12,
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: buttonDisabled ? 'default' : 'pointer',
                  flexShrink: 0,
                }}
              >
                {checkinDone ? '済み' : saving ? '記録中…' : '吸った ✓'}
              </button>
            </div>
            {error && (
              <div style={{ fontSize: 12, color: '#ef4444', marginTop: 8 }}>{error}</div>
            )}
          </div>

          {/* Info grid */}
          <div style={{ padding: '0 16px 16px' }}>
            <div style={sectionTitleStyle}>施設情報</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <InfoCell label="形態" value={spot.is_outdoor ? '屋外開放型' : '室内'} />
              <InfoCell label="加熱式" value={heatedLabel} />
              <InfoCell label="営業時間" value={spot.is_24h ? '24時間' : (spot.hours ?? '不明')} />
              <InfoCell label="住所" value={spot.address ?? '未設定'} />
              {cond && <InfoCell label="利用条件" value={cond} />}
            </div>
            {restricted && (
              <p style={{ fontSize: 12, color: '#92400e', background: '#fef3c7', borderRadius: 10, padding: '10px 12px', marginTop: 10, lineHeight: 1.6 }}>
                この喫煙所は「{cond}」です。誰でも自由に立ち寄れる場所ではないのでご注意ください。
              </p>
            )}
          </div>
        </div>

        {/* Close button */}
        <div style={{ padding: '12px 16px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Link
            href={`/spots/${spot.id}`}
            style={{
              display: 'block',
              textAlign: 'center',
              padding: 12,
              fontSize: 13,
              color: '#f59e0b',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            この場所の詳細ページを開く →
          </Link>
          <button
            onClick={onClose}
            style={{
              width: '100%',
              padding: 14,
              background: '#f5f5f5',
              color: '#1a1a1a',
              border: 'none',
              borderRadius: 14,
              fontSize: 15,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}

function InfoCell({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: '#f9f9f9', borderRadius: 12, padding: 12 }}>
      <div style={{ fontSize: 11, color: '#aaa', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 600 }}>{value}</div>
    </div>
  );
}

const badgeStyle: React.CSSProperties = {
  padding: '3px 10px',
  borderRadius: 10,
  fontSize: 11,
  fontWeight: 600,
  background: 'rgba(255,255,255,0.2)',
  color: 'white',
  backdropFilter: 'blur(4px)',
};

const warnBadgeStyle: React.CSSProperties = {
  ...badgeStyle,
  background: 'rgba(245, 158, 11, 0.95)',
  color: '#1a1a1a',
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 700,
  color: '#888',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  marginBottom: 12,
};
