import Link from 'next/link';
import BottomNav from '@/components/BottomNav';

export const metadata = {
  title: 'ページが見つかりません',
};

export default function NotFound() {
  return (
    <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <div
        style={{
          flex: 1,
          background: '#f5f5f5',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px 20px 96px',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: 48, marginBottom: 16 }}>🚬</div>
        <h1 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>ページが見つかりません</h1>
        <p style={{ fontSize: 14, color: '#888', lineHeight: 1.8, margin: '10px 0 24px' }}>
          お探しのスポットやページは、
          <br />
          削除されたか URL が変わった可能性があります。
        </p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
          <Link
            href="/map"
            style={{
              padding: '12px 24px',
              background: '#f59e0b',
              color: '#1a1a1a',
              borderRadius: 14,
              fontSize: 14,
              fontWeight: 700,
              textDecoration: 'none',
            }}
          >
            🗺 マップへ
          </Link>
          <Link
            href="/areas"
            style={{
              padding: '12px 24px',
              background: 'white',
              color: '#1a1a1a',
              borderRadius: 14,
              fontSize: 14,
              fontWeight: 700,
              textDecoration: 'none',
            }}
          >
            📍 エリアから探す
          </Link>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
