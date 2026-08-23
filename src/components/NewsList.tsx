'use client';

import { useMemo, useState } from 'react';
import { NEWS_CATEGORIES, type NewsCategory, type NewsItem } from '@/lib/news';

type Tab = 'すべて' | NewsCategory;

const TABS: Tab[] = ['すべて', ...NEWS_CATEGORIES];

export default function NewsList({ items }: { items: NewsItem[] }) {
  const [tab, setTab] = useState<Tab>('すべて');

  const filtered = useMemo(
    () => (tab === 'すべて' ? items : items.filter((n) => n.category === tab)),
    [items, tab]
  );

  const featured = filtered[0];
  const rest = filtered.slice(1);

  return (
    <>
      {/* Tabs */}
      <div
        style={{
          background: 'white',
          display: 'flex',
          padding: '0 16px',
          borderBottom: '1px solid #f0f0f0',
          overflowX: 'auto',
          scrollbarWidth: 'none',
        }}
      >
        {TABS.map((t) => {
          const active = t === tab;
          return (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              style={{
                padding: '10px 14px',
                fontSize: 13,
                fontWeight: 600,
                color: active ? '#1a1a1a' : '#aaa',
                whiteSpace: 'nowrap',
                border: 'none',
                borderBottom: active ? '2px solid #f59e0b' : '2px solid transparent',
                background: 'none',
                cursor: 'pointer',
              }}
            >
              {t}
            </button>
          );
        })}
      </div>

      {!featured && (
        <div style={{ padding: '48px 24px', textAlign: 'center', color: '#aaa', fontSize: 13 }}>
          {items.length === 0
            ? 'ニュースを取得できませんでした。時間をおいて再度お試しください。'
            : `「${tab}」のニュースはまだありません。`}
        </div>
      )}

      {/* Featured */}
      {featured && (
        <a
          href={featured.url}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'block',
            margin: 12,
            borderRadius: 16,
            overflow: 'hidden',
            background: '#1a1a1a',
            textDecoration: 'none',
          }}
        >
          <div
            style={{
              height: 160,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 64,
              background: 'linear-gradient(135deg, #2d2d2d, #111)',
            }}
          >
            {featured.emoji}
          </div>
          <div style={{ padding: 14 }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: '#f59e0b',
                letterSpacing: 0.5,
                marginBottom: 6,
              }}
            >
              {featured.category}
            </div>
            <div
              style={{
                fontSize: 17,
                fontWeight: 700,
                color: 'white',
                lineHeight: 1.4,
                marginBottom: 6,
              }}
            >
              {featured.title}
            </div>
            <div style={{ fontSize: 12, color: '#888' }}>
              {featured.source}・{featured.dateLabel}
            </div>
          </div>
        </a>
      )}

      {/* List */}
      <div style={{ margin: '0 12px' }}>
        {rest.map((item) => (
          <a
            key={item.id}
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              background: 'white',
              borderRadius: 14,
              padding: 14,
              marginBottom: 10,
              display: 'flex',
              gap: 12,
              textDecoration: 'none',
              color: 'inherit',
            }}
          >
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: 10,
                background: '#f0f0f0',
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 32,
              }}
            >
              {item.emoji}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: '#f59e0b',
                  letterSpacing: 0.5,
                  marginBottom: 4,
                }}
              >
                {item.category}
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.4, marginBottom: 4 }}>
                {item.title}
              </div>
              <div style={{ fontSize: 11, color: '#aaa' }}>
                {item.source}・{item.dateLabel}
              </div>
            </div>
          </a>
        ))}
      </div>
    </>
  );
}
