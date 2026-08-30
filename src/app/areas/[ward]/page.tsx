import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import BottomNav from '@/components/BottomNav';
import { fetchSpotsByWard } from '@/lib/spots';
import { extractWard } from '@/lib/areas';
import { SPOT_TYPE_LABELS, SPOT_TYPE_EMOJIS, isOpenToAll } from '@/lib/types';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ ward: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { ward } = await params;
  const name = decodeURIComponent(ward);
  return {
    title: `大阪市${name}の喫煙所・喫煙可能店`,
    description: `大阪市${name}にある喫煙所・喫煙可能なカフェ/バー/飲食店の一覧。利用条件つきで確認できます。`,
    alternates: { canonical: `/areas/${ward}` },
  };
}

export default async function WardPage({ params }: Props) {
  const { ward } = await params;
  const name = decodeURIComponent(ward);

  // ilike は「西区」が「西成区」にも当たるので、抜き出した区名の完全一致で絞り直す
  const spots = (await fetchSpotsByWard(name)).filter((s) => extractWard(s.address) === name);
  if (spots.length === 0) notFound();

  return (
    <div style={{ minHeight: '100dvh', background: '#f5f5f5', paddingBottom: 88 }}>
      <div style={{ background: 'white', padding: '14px 16px 12px', borderBottom: '1px solid #f0f0f0' }}>
        <nav style={{ fontSize: 12, color: '#aaa', marginBottom: 6 }}>
          <Link href="/areas" style={{ color: '#aaa' }}>エリア</Link> / {name}
        </nav>
        <h1 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>
          大阪市{name}の喫煙所・喫煙可能店
        </h1>
        <p style={{ fontSize: 12, color: '#888', marginTop: 4 }}>{spots.length}件</p>
      </div>

      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {spots.map((spot) => {
          const restricted = !!spot.usage_condition && !isOpenToAll(spot);
          return (
            <Link
              key={spot.id}
              href={`/spots/${spot.id}`}
              style={{
                background: 'white',
                borderRadius: 14,
                padding: '12px 14px',
                textDecoration: 'none',
                color: '#1a1a1a',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <span style={{ fontSize: 22, flexShrink: 0 }}>{SPOT_TYPE_EMOJIS[spot.type]}</span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: 14, fontWeight: 700, display: 'block' }}>{spot.name}</span>
                <span style={{ fontSize: 12, color: '#aaa' }}>
                  {SPOT_TYPE_LABELS[spot.type]}
                  {restricted && spot.usage_condition ? ` ・ ⚠️ ${spot.usage_condition}` : ''}
                </span>
              </span>
            </Link>
          );
        })}
      </div>

      <BottomNav />
    </div>
  );
}
