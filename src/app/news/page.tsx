import BottomNav from '@/components/BottomNav';
import NewsList from '@/components/NewsList';
import { fetchNews } from '@/lib/news-feed';

export default async function NewsPage() {
  const items = await fetchNews();

  return (
    <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, overflowY: 'auto', background: '#f5f5f5', paddingBottom: 72 }}>
        {/* Header */}
        <div style={{ background: 'white', padding: '14px 16px 12px', borderBottom: '1px solid #f0f0f0' }}>
          <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: -0.5 }}>
            タバコ<span style={{ color: '#f59e0b' }}>ニュース</span>
          </div>
        </div>

        <NewsList items={items} />
      </div>
      <BottomNav />
    </div>
  );
}
