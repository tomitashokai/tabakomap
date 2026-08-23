import type { MetadataRoute } from 'next';

const BASE_URL = 'https://tabakomap.vercel.app';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: `${BASE_URL}/map`, lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: `${BASE_URL}/brands`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${BASE_URL}/news`, lastModified: now, changeFrequency: 'daily', priority: 0.7 },
    { url: `${BASE_URL}/about/data`, lastModified: now, changeFrequency: 'monthly', priority: 0.3 },
  ];
}
