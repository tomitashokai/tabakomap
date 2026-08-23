// ニュースの型・定数。サーバー / クライアント双方から import される。
// フィードの取得と解析は server 専用の news-feed.ts 側にある。

export type NewsCategory = '新銘柄' | '規制' | 'イベント' | 'コラム';

export interface NewsItem {
  id: string;
  title: string;
  url: string;
  source: string;
  publishedAt: string; // ISO8601
  /** 表示用の日付。タイムゾーン差によるハイドレーション不一致を避けるためサーバー側で確定させる */
  dateLabel: string;
  category: NewsCategory;
  emoji: string;
}

export const NEWS_CATEGORIES: NewsCategory[] = ['新銘柄', '規制', 'イベント', 'コラム'];

export const NEWS_CATEGORY_EMOJIS: Record<NewsCategory, string> = {
  新銘柄: '🆕',
  規制: '📋',
  イベント: '💨',
  コラム: '🍃',
};
