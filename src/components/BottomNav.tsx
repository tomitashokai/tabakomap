'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const tabs = [
  { href: '/map', icon: '🗺', label: 'マップ' },
  { href: '/areas', icon: '📍', label: 'エリア' },
  { href: '/news', icon: '📰', label: 'ニュース' },
  { href: '/brands', icon: '🚬', label: '銘柄DB' },
  { href: '/mypage', icon: '👤', label: 'マイページ' },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: 72,
        background: 'white',
        borderTop: '1px solid #f0f0f0',
        display: 'flex',
        alignItems: 'flex-start',
        paddingTop: 8,
        zIndex: 100,
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {tabs.map((tab) => {
        const active = pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 3,
              textDecoration: 'none',
            }}
          >
            <span style={{ fontSize: 24 }}>{tab.icon}</span>
            <span
              style={{
                fontSize: 10,
                fontWeight: active ? 700 : 500,
                color: active ? '#f59e0b' : '#aaa',
              }}
            >
              {tab.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
