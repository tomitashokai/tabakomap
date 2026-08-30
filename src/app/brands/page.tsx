'use client';

import { useState, useEffect } from 'react';
import BottomNav from '@/components/BottomNav';
import { supabase } from '@/lib/supabase';
import { Brand, BrandCategory } from '@/lib/types';

const CATS: { key: BrandCategory | 'all'; label: string }[] = [
  { key: 'all', label: 'すべて' },
  { key: 'cigarette', label: '🚬 紙巻' },
  { key: 'heated', label: '🔥 加熱式' },
  { key: 'shisha', label: '💨 シーシャ' },
  { key: 'cigar', label: '🍃 葉巻' },
  { key: 'other', label: '🌿 その他' },
];

const CAT_EMOJIS: Record<BrandCategory, string> = {
  cigarette: '🚬',
  heated: '🔥',
  shisha: '💨',
  cigar: '🍃',
  other: '🌿',
};

const AVAIL_LABELS: Record<string, string> = {
  everywhere: '全国流通',
  limited: '限定流通',
  specialty: '専門店のみ',
};

/**
 * name 昇順だけで並べるとシーシャのフレーバー名が先頭を占め、
 * 探されることの多い紙巻きが下まで埋もれる。カテゴリを第一キーにする
 */
const CATEGORY_ORDER: BrandCategory[] = ['cigarette', 'heated', 'shisha', 'cigar', 'other'];

function categoryRank(category: BrandCategory | null): number {
  if (!category) return CATEGORY_ORDER.length;
  const i = CATEGORY_ORDER.indexOf(category);
  return i === -1 ? CATEGORY_ORDER.length : i;
}

/** カテゴリ順 → 同カテゴリ内は名前順。名前は日本語を含むので localeCompare で並べる */
function sortBrands(list: Brand[]): Brand[] {
  return [...list].sort(
    (a, b) => categoryRank(a.category) - categoryRank(b.category) || a.name.localeCompare(b.name, 'ja'),
  );
}

export default function BrandsPage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [filtered, setFiltered] = useState<Brand[]>([]);
  const [activeCat, setActiveCat] = useState<BrandCategory | 'all'>('all');
  const [query, setQuery] = useState('');

  useEffect(() => {
    supabase
      .from('brands')
      .select('*')
      .limit(200)
      .then(({ data }) => {
        if (data) {
          const sorted = sortBrands(data as Brand[]);
          setBrands(sorted);
          setFiltered(sorted);
        }
      });
  }, []);

  useEffect(() => {
    let list = brands;
    if (activeCat !== 'all') list = list.filter((b) => b.category === activeCat);
    if (query) list = list.filter((b) => b.name.includes(query) || b.maker?.includes(query));
    setFiltered(list);
  }, [activeCat, query, brands]);

  return (
    <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, overflowY: 'auto', background: '#f5f5f5', paddingBottom: 72 }}>
        {/* Header */}
        <div style={{ background: 'white', padding: '14px 16px 12px', borderBottom: '1px solid #f0f0f0' }}>
          <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: -0.5 }}>
            銘柄<span style={{ color: '#f59e0b' }}>データベース</span>
          </div>
        </div>

        {/* Search */}
        <div style={{ background: 'white', padding: '10px 16px', borderBottom: '1px solid #f0f0f0' }}>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="🔍  銘柄名・メーカーで検索..."
            style={{
              width: '100%',
              padding: '10px 14px',
              border: '1.5px solid #e5e5e5',
              borderRadius: 12,
              fontSize: 14,
              background: '#f9f9f9',
              outline: 'none',
            }}
          />
        </div>

        {/* Category chips */}
        <div
          style={{
            background: 'white',
            padding: '10px 16px',
            display: 'flex',
            gap: 8,
            overflowX: 'auto',
            borderBottom: '1px solid #f0f0f0',
            scrollbarWidth: 'none',
          }}
        >
          {CATS.map((c) => (
            <button
              key={c.key}
              onClick={() => setActiveCat(c.key)}
              style={{
                padding: '6px 14px',
                borderRadius: 20,
                fontSize: 12,
                fontWeight: 600,
                whiteSpace: 'nowrap',
                border: 'none',
                cursor: 'pointer',
                flexShrink: 0,
                background: activeCat === c.key ? '#1a1a1a' : '#f0f0f0',
                color: activeCat === c.key ? 'white' : '#555',
              }}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Brand list */}
        {filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#aaa' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🚬</div>
            <div style={{ fontSize: 14 }}>銘柄がありません</div>
          </div>
        ) : (
          <div style={{ padding: '12px 12px 0' }}>
            {filtered.map((brand) => (
              <div
                key={brand.id}
                style={{
                  background: 'white',
                  borderRadius: 16,
                  padding: 14,
                  marginBottom: 10,
                  display: 'flex',
                  gap: 12,
                  alignItems: 'center',
                  cursor: 'pointer',
                }}
              >
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 14,
                    background: '#f0f0f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 28,
                    flexShrink: 0,
                  }}
                >
                  {brand.category ? CAT_EMOJIS[brand.category] : '🚬'}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 3 }}>{brand.name}</div>
                  <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>{brand.maker ?? '—'}</div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {brand.tar != null && (
                      <span style={tagStyle}>タール {brand.tar}mg</span>
                    )}
                    {brand.nicotine != null && (
                      <span style={tagStyle}>ニコチン {brand.nicotine}mg</span>
                    )}
                    {brand.availability && (
                      <span style={{ ...tagStyle, background: '#fef3c7', color: '#92400e' }}>
                        {AVAIL_LABELS[brand.availability]}
                      </span>
                    )}
                  </div>
                </div>
                {brand.price != null && (
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#1a1a1a', flexShrink: 0 }}>
                    ¥{brand.price}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}

const tagStyle: React.CSSProperties = {
  fontSize: 11,
  padding: '2px 8px',
  borderRadius: 6,
  background: '#f0f0f0',
  color: '#555',
  fontWeight: 600,
};
