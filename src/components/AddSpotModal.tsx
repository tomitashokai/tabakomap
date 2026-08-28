'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { Spot, SpotType, SPOT_TYPE_LABELS, SPOT_TYPE_EMOJIS } from '@/lib/types';

interface Props {
  userLocation: [number, number] | null;
  onClose: () => void;
  onAdded: (spot: Spot) => void;
}

const TYPES: SpotType[] = ['smoking', 'shop', 'shisha', 'cigar', 'cafe', 'bar', 'restaurant'];

/**
 * 未入力のまま登録させると isOpenToAll() が「誰でも利用可」扱いにしてしまい、
 * 店舗利用者限定の喫煙室を誰でも入れる場所として案内してしまう。
 * 選択式にして、既存データで使われている表記（CLAUDE.md 記載）に揃える
 */
const CONDITIONS: { value: string | null; label: string }[] = [
  { value: null, label: '特になし（誰でも利用可）' },
  { value: '店舗利用者のみ', label: '店舗利用者のみ' },
  { value: '会員のみ', label: '会員のみ' },
  { value: '要予約', label: '要予約' },
];

/** getCurrentPosition の失敗理由。原因ごとに言い分けないと、次にどうすればよいか分からない */
const GEO_ERRORS: Record<number, string> = {
  1: '位置情報の利用が許可されていません。ブラウザの設定で許可してください。',
  2: '現在地を特定できませんでした。屋外や窓際で試すと取得できることがあります。',
  3: '現在地の取得に時間がかかっています。',
};

const geoAvailable = () => typeof navigator !== 'undefined' && 'geolocation' in navigator;

export default function AddSpotModal({ userLocation, onClose, onAdded }: Props) {
  const { user } = useAuth();

  /*
   * 位置はモーダル自身で取りに行く。
   * 以前は userLocation が無いと「現在地ボタンを押してください」と出すだけだったが、
   * その 📍 ボタンはモーダルの裏にあって押せない。外をタップすれば閉じるものの
   * 入力が消えるので、登録するには全部打ち直すしかなかった
   */
  const [coords, setCoords] = useState<[number, number] | null>(userLocation);
  const [locating, setLocating] = useState(!userLocation && geoAvailable());
  const [locateError, setLocateError] = useState(
    geoAvailable() ? '' : 'この端末では位置情報を利用できません。'
  );

  const locate = useCallback(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords([pos.coords.longitude, pos.coords.latitude]);
        setLocating(false);
      },
      (err) => {
        setLocating(false);
        setLocateError(GEO_ERRORS[err.code] ?? '現在地を取得できませんでした。');
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  }, []);

  // 効果の本体では setState しない（set-state-in-effect に触れる）。
  // 「取得中」は locating の初期値で表し、確定はコールバック側で行う
  useEffect(() => {
    if (!userLocation && geoAvailable()) locate();
  }, [userLocation, locate]);

  const retryLocate = () => {
    setLocating(true);
    setLocateError('');
    locate();
  };

  const [type, setType] = useState<SpotType>('smoking');
  const [name, setName] = useState('');
  const [isOutdoor, setIsOutdoor] = useState(true);
  const [isHeated, setIsHeated] = useState(false);
  const [is24h, setIs24h] = useState(false);
  const [usageCondition, setUsageCondition] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('名前を入力してください');
      return;
    }
    if (!coords) {
      setError(locating ? '現在地の取得を待っています。' : locateError || '現在地を取得できませんでした。');
      return;
    }
    // RLS が created_by = auth.uid() を要求するので、セッション確定前は登録させない
    if (!user) {
      setError('接続中です。少し待ってからもう一度お試しください。');
      return;
    }

    setSaving(true);
    const { data, error: err } = await supabase
      .from('spots')
      .insert({
        name: name.trim(),
        type,
        lat: coords[1],
        lng: coords[0],
        is_outdoor: isOutdoor,
        is_heated: isHeated,
        is_24h: is24h,
        usage_condition: usageCondition,
        created_by: user.id,
      })
      .select()
      .single();

    if (err) {
      setError('登録に失敗しました');
      setSaving(false);
      return;
    }
    onAdded(data as Spot);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 60,
        background: 'rgba(0,0,0,0.5)',
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
          padding: '20px 20px 40px',
          maxHeight: '90dvh',
          overflowY: 'auto',
        }}
      >
        <div
          style={{
            width: 36,
            height: 4,
            background: '#e0e0e0',
            borderRadius: 2,
            margin: '0 auto 20px',
          }}
        />
        <div style={{ fontSize: 18, fontWeight: 700, textAlign: 'center', marginBottom: 20 }}>
          📍 スポットを登録
        </div>

        {/* Name */}
        <div style={{ marginBottom: 16 }}>
          <div style={labelStyle}>スポット名</div>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例：心斎橋筋商店街 喫煙所"
            style={{
              width: '100%',
              padding: '12px 14px',
              border: '1.5px solid #e5e5e5',
              borderRadius: 12,
              fontSize: 15,
              background: '#f9f9f9',
              outline: 'none',
            }}
          />
        </div>

        {/* Type */}
        <div style={{ marginBottom: 16 }}>
          <div style={labelStyle}>種別</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {TYPES.map((t) => (
              <button
                key={t}
                onClick={() => setType(t)}
                style={{
                  padding: '12px 8px',
                  borderRadius: 14,
                  border: `2px solid ${type === t ? '#1a1a1a' : '#e5e5e5'}`,
                  background: type === t ? '#1a1a1a' : 'white',
                  color: type === t ? 'white' : '#1a1a1a',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  textAlign: 'center',
                }}
              >
                <span style={{ fontSize: 24, display: 'block', marginBottom: 4 }}>
                  {SPOT_TYPE_EMOJIS[t]}
                </span>
                {SPOT_TYPE_LABELS[t]}
              </button>
            ))}
          </div>
        </div>

        {/* Usage condition */}
        <div style={{ marginBottom: 16 }}>
          <div style={labelStyle}>利用条件</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {CONDITIONS.map((c) => (
              <button
                key={c.label}
                onClick={() => setUsageCondition(c.value)}
                style={{
                  padding: '8px 14px',
                  borderRadius: 20,
                  border: `1.5px solid ${usageCondition === c.value ? '#1a1a1a' : '#e5e5e5'}`,
                  background: usageCondition === c.value ? '#1a1a1a' : 'white',
                  color: usageCondition === c.value ? 'white' : '#555',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {c.label}
              </button>
            ))}
          </div>
          <p style={{ fontSize: 11, color: '#aaa', marginTop: 6, lineHeight: 1.5 }}>
            「店舗利用者のみ」などは、行っても吸えないという失敗を防ぐために地図上で注意表示されます
          </p>
        </div>

        {/* Toggles */}
        <div style={{ marginBottom: 20 }}>
          <Toggle label="屋外" value={isOutdoor} onChange={setIsOutdoor} />
          <Toggle label="加熱式OK" value={isHeated} onChange={setIsHeated} />
          <Toggle label="24時間" value={is24h} onChange={setIs24h} />
        </div>

        {/* 現在地の状態。登録は現在地に紐づくので、取れているかを常に見せる */}
        <div
          style={{
            background: coords ? '#f9f9f9' : '#fffbeb',
            borderRadius: 12,
            padding: '10px 12px',
            marginBottom: 12,
            fontSize: 12,
            lineHeight: 1.6,
            color: coords ? '#666' : '#92400e',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <span style={{ flex: 1 }}>
            {coords
              ? `📍 現在地に登録します（${coords[1].toFixed(5)}, ${coords[0].toFixed(5)}）`
              : locating
                ? '📍 現在地を取得しています…'
                : `⚠️ ${locateError || '現在地を取得できませんでした。'}`}
          </span>
          {!coords && !locating && geoAvailable() && (
            <button
              onClick={retryLocate}
              style={{
                flexShrink: 0,
                padding: '6px 12px',
                borderRadius: 20,
                border: '1.5px solid #92400e',
                background: 'white',
                color: '#92400e',
                fontSize: 11,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              もう一度試す
            </button>
          )}
        </div>
        {error && (
          <p style={{ fontSize: 12, color: '#ef4444', marginBottom: 12, textAlign: 'center' }}>
            {error}
          </p>
        )}

        {/* 現在地が無いまま押せると、エラーを見るためだけに押させることになる */}
        <button
          onClick={handleSubmit}
          disabled={saving || !coords}
          style={{
            width: '100%',
            padding: 16,
            background: saving || !coords ? '#d1d5db' : '#1a1a1a',
            color: 'white',
            border: 'none',
            borderRadius: 16,
            fontSize: 16,
            fontWeight: 700,
            cursor: saving || !coords ? 'default' : 'pointer',
          }}
        >
          {saving ? '登録中...' : locating ? '現在地を取得中…' : 'この場所を登録する'}
        </button>
      </div>
    </div>
  );
}

function Toggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
      }}
    >
      <span style={{ fontSize: 14, color: '#333' }}>{label}</span>
      <div
        onClick={() => onChange(!value)}
        style={{
          width: 48,
          height: 28,
          borderRadius: 14,
          background: value ? '#1a1a1a' : '#e0e0e0',
          position: 'relative',
          cursor: 'pointer',
          flexShrink: 0,
          transition: 'background 0.2s',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 3,
            left: value ? 23 : 3,
            width: 22,
            height: 22,
            background: 'white',
            borderRadius: '50%',
            boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
            transition: 'left 0.2s',
          }}
        />
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  color: '#555',
  marginBottom: 8,
};
