'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import BottomNav from '@/components/BottomNav';
import { supabase } from '@/lib/supabase';
import { Spot, SpotType, SPOT_TYPE_LABELS, SPOT_TYPE_EMOJIS, isOpenToAll } from '@/lib/types';
import SpotDetailSheet from '@/components/SpotDetailSheet';
import AddSpotModal from '@/components/AddSpotModal';

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false });

const FILTERS: { type: SpotType | 'all'; label: string }[] = [
  { type: 'all', label: 'すべて' },
  { type: 'smoking', label: '🚬 喫煙所' },
  { type: 'shop', label: '🏪 購入' },
  { type: 'shisha', label: '💨 シーシャ' },
  { type: 'cigar', label: '🍃 葉巻' },
  { type: 'cafe', label: '☕ カフェ' },
  { type: 'bar', label: '🍺 バー' },
  { type: 'restaurant', label: '🍜 飲食店' },
];

/** 選んだ時点で店舗を利用するつもりだと分かる種別 */
const STORE_TYPES = new Set<SpotType>(['shop', 'shisha', 'cigar', 'cafe', 'bar', 'restaurant']);

/** 「近くのスポット」シートの高さ */
const SHEET_HEIGHT = 220;
/** BottomNav の高さ。シートはこの上に載せる（下に潜るとカードが切れる） */
const NAV_HEIGHT = 72;
/** シートとボタンの間隔 */
const CONTROL_GAP = 12;
/** 検索バー + フィルターチップが覆っている高さ */
const TOP_CHROME = 110;

/** ホームバーのある端末では BottomNav がその分せり上がるので追従させる */
const ABOVE_NAV = `calc(${NAV_HEIGHT}px + env(safe-area-inset-bottom))`;
const ABOVE_SHEET = `calc(${NAV_HEIGHT + SHEET_HEIGHT + CONTROL_GAP}px + env(safe-area-inset-bottom))`;

/**
 * 地図の上に乗っている UI の分だけカメラに余白を持たせる。
 * これが無いと現在地に移動したときピンがフィルターチップやシートの下に潜る
 */
const MAP_PADDING = { top: TOP_CHROME, bottom: NAV_HEIGHT + SHEET_HEIGHT, left: 0, right: 0 };

/** 検索は名前と住所の部分一致。住所を含めないと「梅田」「難波」で引けない */
function matchesQuery(spot: Spot, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    spot.name.toLowerCase().includes(q) || (spot.address?.toLowerCase().includes(q) ?? false)
  );
}

export default function MapPage() {
  const [spots, setSpots] = useState<Spot[]>([]);
  const [activeFilter, setActiveFilter] = useState<SpotType | 'all'>('all');
  // 既定では誰でも立ち寄れる場所だけを出す。「店舗利用者のみ」を混ぜると、
  // 行っても吸えない場所が地図の大半を占めてしまう
  const [showRestricted, setShowRestricted] = useState(false);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [selectedSpot, setSelectedSpot] = useState<Spot | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [query, setQuery] = useState('');

  useEffect(() => {
    supabase
      .from('spots')
      .select('*')
      // 大阪市内だけで 542 件あり、200 件で切ると取り込んだ喫煙可能店が地図に出ない。
      // 全件でも 100KB 程度なので今は素直に読む（他都市を足すなら表示範囲で絞ること）
      .limit(2000)
      .then(({ data }) => {
        if (data) setSpots(data as Spot[]);
      });
  }, []);

  // カフェやバーを選んだ時点で店舗利用は前提なので、そこでは条件つきも出す。
  // 「誰でも利用可だけ」が効くのは「すべて」と「喫煙所」
  const patronageImplied = activeFilter !== 'all' && STORE_TYPES.has(activeFilter);

  // 絞り込み結果は取得済みの一覧と操作状態から決まるので、レンダー中に導出する
  const filtered = useMemo(() => {
    let list = spots;
    if (activeFilter !== 'all') list = list.filter((s) => s.type === activeFilter);
    if (!showRestricted && !patronageImplied) list = list.filter(isOpenToAll);
    if (query.trim()) list = list.filter((s) => matchesQuery(s, query));
    return list;
  }, [activeFilter, showRestricted, patronageImplied, spots, query]);

  /**
   * 選択中の種別のうち、利用条件つきの件数。
   * showRestricted では変えない。0 にするとトグルごと消えて戻せなくなる
   */
  const restrictedCount = patronageImplied
    ? 0
    : spots.filter(
        (s) =>
          (activeFilter === 'all' || s.type === activeFilter) &&
          !isOpenToAll(s) &&
          matchesQuery(s, query),
      ).length;

  const handleLocate = useCallback(() => {
    navigator.geolocation.getCurrentPosition((pos) => {
      setUserLocation([pos.coords.longitude, pos.coords.latitude]);
    });
  }, []);

  const handleSpotAdded = useCallback((spot: Spot) => {
    setSpots((prev) => [spot, ...prev]);
    setShowAddModal(false);
  }, []);

  return (
    <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column' }}>
      {/* Map area */}
      <div style={{ flex: 1, position: 'relative' }}>
        <MapView
          spots={filtered}
          center={userLocation ?? undefined}
          onSpotClick={setSelectedSpot}
          padding={MAP_PADDING}
        />

        {/* Search bar */}
        <div
          style={{
            position: 'absolute',
            top: 16,
            left: 16,
            right: 16,
            zIndex: 10,
          }}
        >
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="🔍  スポット名・住所で検索..."
            style={{
              width: '100%',
              padding: '12px 16px',
              borderRadius: 14,
              border: 'none',
              background: 'white',
              fontSize: 15,
              boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
              outline: 'none',
            }}
          />
        </div>

        {/* Filter chips */}
        <div
          style={{
            position: 'absolute',
            top: 72,
            left: 0,
            right: 0,
            zIndex: 10,
            padding: '0 16px',
            display: 'flex',
            gap: 8,
            overflowX: 'auto',
            scrollbarWidth: 'none',
          }}
        >
          {FILTERS.map((f) => (
            <button
              key={f.type}
              onClick={() => setActiveFilter(f.type)}
              style={{
                padding: '6px 14px',
                borderRadius: 20,
                fontSize: 12,
                fontWeight: 600,
                whiteSpace: 'nowrap',
                border: 'none',
                cursor: 'pointer',
                flexShrink: 0,
                background: activeFilter === f.type ? '#1a1a1a' : 'white',
                color: activeFilter === f.type ? 'white' : '#555',
                boxShadow: activeFilter === f.type ? 'none' : '0 1px 4px rgba(0,0,0,0.12)',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* FAB + locate */}
        <div
          style={{
            position: 'absolute',
            left: 16,
            // シート（高さ 220 / zIndex 20）の上に出す。
            // 200 のままだとシートに飲み込まれて押せない
            bottom: ABOVE_SHEET,
            zIndex: 30,
            display: 'flex',
            gap: 10,
          }}
        >
          <button
            onClick={() => setShowAddModal(true)}
            style={{
              background: '#f59e0b',
              color: '#1a1a1a',
              border: 'none',
              padding: '10px 18px',
              borderRadius: 24,
              fontSize: 14,
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
            }}
          >
            ＋ 登録
          </button>
        </div>
        <button
          onClick={handleLocate}
          style={{
            position: 'absolute',
            right: 16,
            bottom: ABOVE_SHEET,
            width: 44,
            height: 44,
            background: 'white',
            border: 'none',
            borderRadius: '50%',
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
            fontSize: 20,
            zIndex: 30,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          📍
        </button>

        {/* Nearby spots sheet */}
        {!selectedSpot && (
          <div
            style={{
              position: 'absolute',
              // BottomNav（fixed / zIndex 100）の上に載せる。
              // bottom:0 だと下 72px がナビに隠れてカードが切れる
              bottom: ABOVE_NAV,
              left: 0,
              right: 0,
              background: 'white',
              borderRadius: '24px 24px 0 0',
              zIndex: 20,
              boxShadow: '0 -4px 20px rgba(0,0,0,0.1)',
              height: SHEET_HEIGHT,
            }}
          >
            <div
              style={{
                width: 36,
                height: 4,
                background: '#e0e0e0',
                borderRadius: 2,
                margin: '10px auto 12px',
              }}
            />
            <div
              style={{
                padding: '0 16px 10px',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <span style={{ fontSize: 13, fontWeight: 600, color: '#888' }}>
                近くのスポット ({filtered.length}件)
              </span>
              {restrictedCount > 0 && (
                <button
                  onClick={() => setShowRestricted((v) => !v)}
                  style={{
                    marginLeft: 'auto',
                    flexShrink: 0,
                    padding: '5px 10px',
                    borderRadius: 20,
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: 'pointer',
                    border: `1.5px solid ${showRestricted ? '#1a1a1a' : '#e5e5e5'}`,
                    background: showRestricted ? '#1a1a1a' : 'white',
                    color: showRestricted ? 'white' : '#666',
                  }}
                >
                  {showRestricted ? '✓ ' : ''}店舗利用者のみも表示（{restrictedCount}）
                </button>
              )}
            </div>
            <div style={{ overflowX: 'auto', overflowY: 'hidden', scrollbarWidth: 'none' }}>
              <div style={{ display: 'flex', gap: 10, padding: '0 16px 16px' }}>
                {filtered.slice(0, 10).map((spot) => (
                  <div
                    key={spot.id}
                    onClick={() => setSelectedSpot(spot)}
                    style={{
                      flexShrink: 0,
                      width: 140,
                      background: '#f9f9f9',
                      borderRadius: 14,
                      padding: 12,
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ fontSize: 28, marginBottom: 6 }}>
                      {SPOT_TYPE_EMOJIS[spot.type as SpotType]}
                    </div>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        marginBottom: 4,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {spot.name}
                    </div>
                    <div style={{ fontSize: 11, color: '#888' }}>
                      {SPOT_TYPE_LABELS[spot.type as SpotType]}
                    </div>
                    {/* 「店舗利用者のみ」を隠すと、行っても吸えない場所へ案内することになる */}
                    {spot.usage_condition && spot.usage_condition !== '特になし' && (
                      <div
                        style={{
                          fontSize: 10,
                          color: '#92400e',
                          background: '#fef3c7',
                          borderRadius: 6,
                          padding: '2px 6px',
                          marginTop: 6,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {spot.usage_condition}
                      </div>
                    )}
                  </div>
                ))}
                {filtered.length === 0 && (
                  <div style={{ color: '#aaa', fontSize: 14, padding: '8px 0', lineHeight: 1.7 }}>
                    {restrictedCount > 0
                      ? '誰でも利用できる場所はありません。右上から店舗利用者向けの場所も表示できます。'
                      : query.trim()
                        ? `「${query.trim()}」に一致するスポットはありません`
                        : 'スポットがありません'}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Spot detail sheet */}
      {selectedSpot && (
        <SpotDetailSheet spot={selectedSpot} onClose={() => setSelectedSpot(null)} />
      )}

      {/* Add spot modal */}
      {showAddModal && (
        <AddSpotModal
          userLocation={userLocation}
          onClose={() => setShowAddModal(false)}
          onAdded={handleSpotAdded}
        />
      )}

      <BottomNav />
    </div>
  );
}
