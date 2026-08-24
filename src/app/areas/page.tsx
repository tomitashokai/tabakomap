import type { Metadata } from 'next';
import Link from 'next/link';
import BottomNav from '@/components/BottomNav';
import { fetchAllSpots } from '@/lib/spots';
import { groupByWard } from '@/lib/areas';

// 1時間ごとに再生成する。データ取得側（supabase-cached.ts）の revalidate と揃えること
export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'エリアから探す',
  description: '大阪市の区ごとに喫煙所・喫煙可能店の一覧を掲載。お住まい・お出かけのエリアから探せます。',
  alternates: { canonical: '/areas' },
};

export default async function AreasPage() {
  const spots = await fetchAllSpots();
  const groups = groupByWard(spots);

  return (
    <div style={{ minHeight: '100dvh', background: '#f5f5f5', paddingBottom: 88 }}>
      <div style={{ background: 'white', padding: '14px 16px 12px', borderBottom: '1px solid #f0f0f0' }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: -0.5, margin: 0 }}>
          エリアから<span style={{ color: '#f59e0b' }}>探す</span>
        </h1>
      </div>

      <div style={{ padding: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {groups.map(({ ward, spots }) => (
          <Link
            key={ward}
            href={`/areas/${encodeURIComponent(ward)}`}
            style={{
              background: 'white',
              borderRadius: 14,
              padding: '14px 16px',
              textDecoration: 'none',
              color: '#1a1a1a',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span style={{ fontSize: 14, fontWeight: 700 }}>{ward}</span>
            <span style={{ fontSize: 12, color: '#aaa' }}>{spots.length}件</span>
          </Link>
        ))}
      </div>

      <BottomNav />
    </div>
  );
}
