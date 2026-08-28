'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import BottomNav from '@/components/BottomNav';
import { supabase } from '@/lib/supabase';
import {
  AVAILABILITY_LABELS,
  BRAND_CATEGORY_EMOJIS,
  BRAND_CATEGORY_ORDER,
  type Brand,
  type BrandCategory,
} from '@/lib/types';

/** チップに入る短縮ラベル。詳細ページ側の正式名（BRAND_CATEGORY_LABELS）とは別に持つ */
const CHIP_LABELS: Record<BrandCategory, string> = {
  cigarette: '紙巻',
  heated: '加熱式',
  shisha: 'シーシャ',
  cigar: '葉巻',
  other: 'その他',
};

/** チップの並びは BRAND_CATEGORY_ORDER に従うので、一覧の並び順と食い違わない */
const CATS: { key: BrandCategory | 'all'; label: string }[] = [
  { key: 'all', label: 'すべて' },
  ...BRAND_CATEGORY_ORDER.map((key) => ({
    key,
    label: `${BRAND_CATEGORY_EMOJIS[key]} ${CHIP_LABELS[key]}`,
  })),
];

/** category が null の行は末尾に寄せる */
function catRank(c: BrandCategory | null): number {
  const i = c ? BRAND_CATEGORY_ORDER.indexOf(c) : -1;
  return i === -1 ? BRAND_CATEGORY_ORDER.length : i;
}

function byCategoryThenName(a: Brand, b: Brand): number {
  return catRank(a.category) - catRank(b.category) || a.name.localeCompare(b.name, 'ja');
}

export default function BrandsPage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [activeCat, setActiveCat] = useState<BrandCategory | 'all'>('all');
  const [query, setQuery] = useState('');

  useEffect(() => {
    supabase
      .from('brands')
      // カテゴリの任意順は PostgREST の order では表現できない
      // （アルファベット順になり cigar が先頭に来る）ので取得後に並べ替える
      .select('*')
      .limit(200)
      .then(({ data }) => {
        if (data) setBrands((data as Brand[]).sort(byCategoryThenName));
      });
  }, []);

  /** 派生値なので効果の中で setState しない（描画が二度走り、一瞬だけ古い一覧が出る） */
  const filtered = useMemo(() => {
    let list = brands;
    if (activeCat !== 'all') list = list.filter((b) => b.category === activeCat);
    if (query) list = list.filter((b) => b.name.includes(query) || b.maker?.includes(query));
    return list;
  }, [brands, activeCat, query]);

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
            <div style={{ fontSize: 14 }}>
              {query.trim() ? `「${query.trim()}」に一致する銘柄はありません` : '銘柄がありません'}
            </div>
          </div>
        ) : (
          <div style={{ padding: '12px 12px 0' }}>
            {filtered.map((brand) => (
              <Link
                key={brand.id}
                href={`/brands/${brand.id}`}
                style={{
                  background: 'white',
                  borderRadius: 16,
                  padding: 14,
                  marginBottom: 10,
                  display: 'flex',
                  gap: 12,
                  alignItems: 'center',
                  cursor: 'pointer',
                  textDecoration: 'none',
                  color: 'inherit',
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
                  {brand.category ? BRAND_CATEGORY_EMOJIS[brand.category] : '🚬'}
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
                        {AVAILABILITY_LABELS[brand.availability]}
                      </span>
                    )}
                  </div>
                </div>
                {brand.price != null && (
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#1a1a1a', flexShrink: 0 }}>
                    ¥{brand.price}
                  </div>
                )}
                <span style={{ color: '#ccc', flexShrink: 0 }}>›</span>
              </Link>
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
