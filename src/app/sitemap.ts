import type { MetadataRoute } from 'next';
import { fetchAllSpots } from '@/lib/spots';
import { fetchAllBrands } from '@/lib/brands';
import { groupByWard } from '@/lib/areas';

const BASE_URL = 'https://tabakomap.vercel.app';

// スポットは投稿で増減するのでビルド時に固定しない。ただしクローラが叩くたびに
// 542件を読み直す必要はないので1時間ごとの再生成にする
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${BASE_URL}/map`, lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: `${BASE_URL}/areas`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${BASE_URL}/brands`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${BASE_URL}/news`, lastModified: now, changeFrequency: 'daily', priority: 0.7 },
    { url: `${BASE_URL}/about/data`, lastModified: now, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${BASE_URL}/about/privacy`, lastModified: now, changeFrequency: 'monthly', priority: 0.3 },
  ];

  // スポットと銘柄は互いに独立なので並行して読む
  const [spots, brands] = await Promise.all([fetchAllSpots(), fetchAllBrands()]);

  const areaRoutes: MetadataRoute.Sitemap = groupByWard(spots).map(({ ward }) => ({
    url: `${BASE_URL}/areas/${encodeURIComponent(ward)}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.6,
  }));

  const spotRoutes: MetadataRoute.Sitemap = spots.map((spot) => ({
    url: `${BASE_URL}/spots/${spot.id}`,
    lastModified: spot.updated_at ? new Date(spot.updated_at) : now,
    changeFrequency: 'monthly',
    priority: 0.5,
  }));

  // brands には updated_at が無いので lastModified は再生成時刻になる
  const brandRoutes: MetadataRoute.Sitemap = brands.map((brand) => ({
    url: `${BASE_URL}/brands/${brand.id}`,
    lastModified: now,
    changeFrequency: 'monthly',
    priority: 0.5,
  }));

  return [...staticRoutes, ...areaRoutes, ...spotRoutes, ...brandRoutes];
}
