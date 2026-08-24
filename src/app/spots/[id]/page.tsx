import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import BottomNav from '@/components/BottomNav';
import { fetchSpotById } from '@/lib/spots';
import { SPOT_TYPE_LABELS, SPOT_TYPE_EMOJIS, isOpenToAll } from '@/lib/types';
import { extractWard } from '@/lib/areas';

// 1時間ごとに再生成する。データ取得側（supabase-cached.ts）の revalidate と揃えること
export const revalidate = 3600;

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const spot = await fetchSpotById(id);
  if (!spot) return { title: 'スポットが見つかりません' };

  const ward = extractWard(spot.address);
  const typeLabel = SPOT_TYPE_LABELS[spot.type];
  const title = `${spot.name}（${ward ?? '大阪'}の${typeLabel}）`;
  const description = [
    spot.address,
    spot.usage_condition ? `利用条件: ${spot.usage_condition}` : null,
    spot.hours ? `営業時間: ${spot.hours}` : null,
  ]
    .filter(Boolean)
    .join(' / ');

  return {
    title,
    description: description || `${spot.name}の場所・利用条件をタバコマップで確認できます。`,
    alternates: { canonical: `/spots/${id}` },
    openGraph: { title, description },
  };
}

export default async function SpotPage({ params }: Props) {
  const { id } = await params;
  const spot = await fetchSpotById(id);
  if (!spot) notFound();

  const ward = extractWard(spot.address);
  const cond = spot.usage_condition;
  const restricted = !!cond && !isOpenToAll(spot);
  const mapsHref = `https://www.google.com/maps/search/?api=1&query=${spot.lat},${spot.lng}`;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Place',
    name: spot.name,
    address: spot.address ?? undefined,
    geo: { '@type': 'GeoCoordinates', latitude: spot.lat, longitude: spot.lng },
  };

  return (
    <div style={{ minHeight: '100dvh', background: '#f5f5f5', paddingBottom: 88 }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div style={{ background: 'linear-gradient(135deg, #2d2d2d, #1a1a1a)', padding: '28px 20px 24px', color: 'white' }}>
        <nav style={{ fontSize: 12, opacity: 0.7, marginBottom: 10 }}>
          <Link href="/map" style={{ color: 'white' }}>マップ</Link>
          {ward && (
            <>
              {' / '}
              <Link href={`/areas/${encodeURIComponent(ward)}`} style={{ color: 'white' }}>{ward}</Link>
            </>
          )}
        </nav>
        <div style={{ fontSize: 40, marginBottom: 8 }}>{SPOT_TYPE_EMOJIS[spot.type]}</div>
        <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>{spot.name}</h1>
        <p style={{ fontSize: 13, opacity: 0.8, marginTop: 6 }}>
          {SPOT_TYPE_LABELS[spot.type]}{ward ? ` ・ 大阪市${ward}` : ''}
        </p>
      </div>

      <div style={{ padding: 16 }}>
        {restricted && (
          <p style={{ fontSize: 13, color: '#92400e', background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 12, padding: '12px 14px', lineHeight: 1.6, marginBottom: 16 }}>
            ⚠️ この場所は「{cond}」です。誰でも自由に立ち寄れるわけではないのでご注意ください。
          </p>
        )}

        <dl style={{ background: 'white', borderRadius: 16, padding: '4px 16px', margin: 0 }}>
          <Row label="住所" value={spot.address ?? '未設定'} />
          <Row label="形態" value={spot.is_outdoor ? '屋外開放型' : '室内'} />
          <Row label="加熱式" value={spot.is_heated ? '可' : '不明'} />
          <Row label="営業時間" value={spot.is_24h ? '24時間' : (spot.hours ?? '不明')} />
          {cond && <Row label="利用条件" value={cond} last />}
        </dl>

        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
          <a
            href={mapsHref}
            target="_blank"
            rel="noopener noreferrer"
            style={{ flex: 1, textAlign: 'center', padding: 14, background: 'white', borderRadius: 14, fontSize: 14, fontWeight: 700, color: '#1a1a1a', textDecoration: 'none' }}
          >
            📍 経路案内
          </a>
          <Link
            href="/map"
            style={{ flex: 1, textAlign: 'center', padding: 14, background: '#f59e0b', borderRadius: 14, fontSize: 14, fontWeight: 700, color: '#1a1a1a', textDecoration: 'none' }}
          >
            🗺 地図で見る
          </Link>
        </div>

        {ward && (
          <p style={{ fontSize: 13, color: '#888', marginTop: 20, textAlign: 'center' }}>
            <Link href={`/areas/${encodeURIComponent(ward)}`} style={{ color: '#f59e0b', fontWeight: 600 }}>
              大阪市{ward}の喫煙所・喫煙可能店を他にも見る →
            </Link>
          </p>
        )}
      </div>

      <BottomNav />
    </div>
  );
}

function Row({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '14px 0', borderBottom: last ? 'none' : '1px solid #f5f5f5' }}>
      <dt style={{ fontSize: 13, color: '#888', flexShrink: 0 }}>{label}</dt>
      <dd style={{ fontSize: 14, fontWeight: 600, margin: 0, textAlign: 'right' }}>{value}</dd>
    </div>
  );
}
