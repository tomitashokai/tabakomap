import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const base = 'https://tabakomap.vercel.app';
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/mypage'],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
