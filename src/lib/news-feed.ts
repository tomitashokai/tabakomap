// Google ニュース RSS からタバコ関連ニュースを取得する（サーバー専用）。
// 外部パーサーは使わず、RSS 2.0 の item を必要な範囲だけ正規表現で取り出す。

import { NEWS_CATEGORY_EMOJIS, type NewsCategory, type NewsItem } from './news';

const FEED_QUERY = 'タバコ OR 喫煙所 OR 加熱式たばこ OR シーシャ';
const FEED_URL =
  'https://news.google.com/rss/search?q=' +
  encodeURIComponent(FEED_QUERY) +
  '&hl=ja&gl=JP&ceid=JP:ja';

const REVALIDATE_SECONDS = 1800; // 30分

// タイトルに含まれる語からカテゴリーを推定する。上から順に評価し、最初に当たったものを採用。
const CATEGORY_RULES: [NewsCategory, RegExp][] = [
  ['規制', /規制|条例|禁煙|分煙|受動喫煙|増税|値上げ|法案|改正|罰則|過料|訴訟|判決/],
  ['新銘柄', /新発売|新商品|発売|リニューアル|限定|銘柄|新フレーバー|新型/],
  ['イベント', /イベント|フェス|開催|キャンペーン|出店|オープン|コラボ/],
];

// 検索クエリが広いため、通販・市場調査レポートなど明らかに無関係な記事を落とす
const NOISE = /スニーカー|中古|通販|市場規模|調査レポート|マーケットレポート|レポートを発表|ふるさと納税|クーポン|求人|占い/;

const ENTITIES: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&apos;': "'",
  '&nbsp;': ' ',
};

const DATE_FORMAT = new Intl.DateTimeFormat('ja-JP', {
  timeZone: 'Asia/Tokyo',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
});

function decodeEntities(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&[a-z]+;/gi, (m) => ENTITIES[m.toLowerCase()] ?? m);
}

function tagContent(block: string, tag: string): string {
  // <tag ...>中身</tag> と <tag ...><![CDATA[中身]]></tag> の両方に対応
  const m = block.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, 'i'));
  if (!m) return '';
  const raw = m[1].trim();
  const cdata = raw.match(/^<!\[CDATA\[([\s\S]*?)\]\]>$/);
  return decodeEntities(cdata ? cdata[1] : raw).trim();
}

function classify(title: string): NewsCategory {
  for (const [category, pattern] of CATEGORY_RULES) {
    if (pattern.test(title)) return category;
  }
  return 'コラム';
}

/** Google ニュースのタイトル末尾に付く「 - 媒体名」を取り除く */
function stripSourceSuffix(title: string, source: string): string {
  if (!source) return title;
  const suffix = ` - ${source}`;
  return title.endsWith(suffix) ? title.slice(0, -suffix.length).trim() : title;
}

function parseFeed(xml: string): NewsItem[] {
  const items: NewsItem[] = [];

  for (const m of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
    const block = m[1];
    const source = tagContent(block, 'source');
    const title = stripSourceSuffix(tagContent(block, 'title'), source);
    const url = tagContent(block, 'link');
    if (!title || !url || NOISE.test(title)) continue;

    const parsed = new Date(tagContent(block, 'pubDate'));
    const publishedAt = Number.isNaN(parsed.getTime()) ? new Date(0) : parsed;
    const category = classify(title);

    items.push({
      id: tagContent(block, 'guid') || url,
      title,
      url,
      source: source || 'Google ニュース',
      publishedAt: publishedAt.toISOString(),
      dateLabel: DATE_FORMAT.format(publishedAt),
      category,
      emoji: NEWS_CATEGORY_EMOJIS[category],
    });
  }

  return items.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}

/**
 * タバコ関連ニュースを取得する。
 * 失敗しても例外は投げず空配列を返し、呼び出し側で空状態を表示する。
 */
export async function fetchNews(limit = 30): Promise<NewsItem[]> {
  try {
    const res = await fetch(FEED_URL, {
      headers: { 'user-agent': 'tabakomap/1.0 (+https://tabakomap.vercel.app)' },
      next: { revalidate: REVALIDATE_SECONDS },
    });
    if (!res.ok) {
      console.error(`[news] feed responded ${res.status}`);
      return [];
    }
    return parseFeed(await res.text()).slice(0, limit);
  } catch (err) {
    console.error('[news] failed to fetch feed', err);
    return [];
  }
}
