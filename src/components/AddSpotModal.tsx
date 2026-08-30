'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { reverseGeocode } from '@/lib/geocode';
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

export default function AddSpotModal({ userLocation, onClose, onAdded }: Props) {
  const { user } = useAuth();
  const [type, setType] = useState<SpotType>('smoking');
  const [name, setName] = useState('');
  const [isOutdoor, setIsOutdoor] = useState(true);
  const [isHeated, setIsHeated] = useState(false);
  const [is24h, setIs24h] = useState(false);
  const [usageCondition, setUsageCondition] = useState<string | null>(null);
  const [address, setAddress] = useState('');
  // モーダルが開いている間 userLocation は変わらない（現在地ボタンはオーバーレイの裏）ので、
  // 初期値で決めてしまい、あとは取得完了時に false にするだけにする
  const [geocoding, setGeocoding] = useState(!!userLocation);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // 住所が無いとエリアページのどの区にも並ばないので、座標から下書きを作る。
  // 引けなかったときは空欄のままにして、手入力に任せる
  useEffect(() => {
    if (!userLocation) return;
    let active = true;

    reverseGeocode(userLocation[1], userLocation[0]).then((found) => {
      if (!active) return;
      // 入力済みなら上書きしない
      if (found) setAddress((prev) => prev || found);
      setGeocoding(false);
    });

    return () => {
      active = false;
    };
  }, [userLocation]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('名前を入力してください');
      return;
    }
    if (!userLocation) {
      setError('位置情報を取得できませんでした。位置情報を許可してください。');
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
        lat: userLocation[1],
        lng: userLocation[0],
        is_outdoor: isOutdoor,
        is_heated: isHeated,
        is_24h: is24h,
        usage_condition: usageCondition,
        address: address.trim() || null,
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

        {/* Address */}
        <div style={{ marginBottom: 16 }}>
          <div style={labelStyle}>住所</div>
          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder={geocoding ? '現在地から取得中…' : '例：大阪市中央区心斎橋筋2丁目'}
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
          <p style={{ fontSize: 11, color: '#aaa', marginTop: 6, lineHeight: 1.5 }}>
            区が分かるように入れておくと、エリア別の一覧にも表示されます
          </p>
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

        {!userLocation && (
          <p style={{ fontSize: 12, color: '#f59e0b', marginBottom: 12, textAlign: 'center' }}>
            ⚠️ 現在地ボタンを押して位置を取得してください
          </p>
        )}
        {error && (
          <p style={{ fontSize: 12, color: '#ef4444', marginBottom: 12, textAlign: 'center' }}>
            {error}
          </p>
        )}

        <button
          onClick={handleSubmit}
          disabled={saving}
          style={{
            width: '100%',
            padding: 16,
            background: saving ? '#d1d5db' : '#1a1a1a',
            color: 'white',
            border: 'none',
            borderRadius: 16,
            fontSize: 16,
            fontWeight: 700,
            cursor: saving ? 'default' : 'pointer',
          }}
        >
          {saving ? '登録中...' : 'この場所を登録する'}
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
