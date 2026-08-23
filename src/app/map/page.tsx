'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import BottomNav from '@/components/BottomNav';
import { supabase } from '@/lib/supabase';
import { Spot, SpotType, SPOT_TYPE_LABELS, SPOT_TYPE_EMOJIS } from '@/lib/types';
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

export default function MapPage() {
  const [spots, setSpots] = useState<Spot[]>([]);
  const [filtered, setFiltered] = useState<Spot[]>([]);
  const [activeFilter, setActiveFilter] = useState<SpotType | 'all'>('all');
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [selectedSpot, setSelectedSpot] = useState<Spot | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    supabase
      .from('spots')
      .select('*')
      // 大阪市内だけで 542 件あり、200 件で切ると取り込んだ喫煙可能店が地図に出ない。
      // 全件でも 100KB 程度なので今は素直に読む（他都市を足すなら表示範囲で絞ること）
      .limit(2000)
      .then(({ data }) => {
        if (data) {
          setSpots(data as Spot[]);
          setFiltered(data as Spot[]);
        }
      });
  }, []);

  useEffect(() => {
    if (activeFilter === 'all') {
      setFiltered(spots);
    } else {
      setFiltered(spots.filter((s) => s.type === activeFilter));
    }
  }, [activeFilter, spots]);

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
            placeholder="🔍  場所・銘柄で検索..."
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
            bottom: 200,
            zIndex: 10,
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
            bottom: 200,
            width: 44,
            height: 44,
            background: 'white',
            border: 'none',
            borderRadius: '50%',
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
            fontSize: 20,
            zIndex: 10,
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
              bottom: 0,
              left: 0,
              right: 0,
              background: 'white',
              borderRadius: '24px 24px 0 0',
              zIndex: 20,
              boxShadow: '0 -4px 20px rgba(0,0,0,0.1)',
              height: 220,
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
                fontSize: 13,
                fontWeight: 600,
                color: '#888',
              }}
            >
              近くのスポット ({filtered.length}件)
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
                  </div>
                ))}
                {filtered.length === 0 && (
                  <div style={{ color: '#aaa', fontSize: 14, padding: '8px 0' }}>
                    スポットがありません
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
