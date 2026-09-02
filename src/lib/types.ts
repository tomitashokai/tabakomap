export type SpotType = 'smoking' | 'shop' | 'shisha' | 'cigar' | 'cafe' | 'bar' | 'restaurant';
export type BrandCategory = 'cigarette' | 'heated' | 'shisha' | 'cigar' | 'other';
export type Availability = 'everywhere' | 'limited' | 'specialty';

export interface Spot {
  id: string;
  name: string;
  type: SpotType;
  lat: number;
  lng: number;
  address: string | null;
  is_outdoor: boolean;
  is_heated: boolean;
  is_24h: boolean;
  hours: string | null;
  /**
   * 利用条件の原文（例: 店舗利用者のみ / 地下街利用者のみ / 加熱式専用 / 特になし）。
   * null は不明。「店舗利用者のみ」なら誰でも入れるわけではないので必ず表示すること
   */
  usage_condition: string | null;
  /** 投稿したユーザー。運営がインポートしたスポットは null */
  created_by: string | null;
  created_at: string;
  updated_at: string;
  distance?: number;
  checkin_count?: number;
  last_checkin?: string;
}

export interface Brand {
  id: string;
  name: string;
  maker: string | null;
  category: BrandCategory | null;
  tar: number | null;
  nicotine: number | null;
  price: number | null;
  /** 公式で定価を確認した日（`YYYY-MM-DD`）。null は未確認 */
  price_as_of: string | null;
  /** 価格の出典。**null は参考価格**で、定価として表示してはいけない */
  price_source: string | null;
  availability: Availability | null;
  image_url: string | null;
  created_at: string;
}

/**
 * その価格が公式の小売定価かどうか。
 *
 * `scripts/brands-seed.json` の価格は実在 SKU の定価ではなく生成された概算で、
 * 公式カタログに無い銘柄も混ざっている。裏が取れた分だけ
 * `scripts/brand-prices-verified.json` から `price_source` が入るので、
 * **画面で「定価」と言えるのはこれが真のときだけ。**
 */
export function isVerifiedPrice(brand: Pick<Brand, 'price' | 'price_source'>): boolean {
  return brand.price != null && brand.price_source != null;
}

/**
 * 「JT公式 2026年9月2日時点」の形。参考価格（出典なし）では null を返す。
 *
 * `price_as_of` は date 型なので PostgREST から `YYYY-MM-DD` の文字列で来る。
 * `new Date()` に通すと UTC 解釈で前日に転ぶので、文字列のまま切り出す。
 */
export function formatPriceProvenance(
  brand: Pick<Brand, 'price_as_of' | 'price_source'>
): string | null {
  if (!brand.price_source) return null;
  const m = brand.price_as_of?.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return brand.price_source;
  return `${brand.price_source} ${Number(m[1])}年${Number(m[2])}月${Number(m[3])}日時点`;
}

export interface Checkin {
  id: string;
  spot_id: string;
  user_id: string | null;
  created_at: string;
}

/**
 * 誰でも立ち寄れる場所かどうか。
 *
 * 「店舗利用者のみ」は買い物や飲食が前提なので、吸える場所を探している人にとっては
 * 別枠として扱う。一方「地下街利用者のみ」は通りがかれば誰でも該当するので含める。
 * 「加熱式専用」は吸えるものの制限であって、入れる人の制限ではない。
 * 条件の記載が無いスポット（大阪市指定喫煙所やユーザー投稿）は誰でも利用可とみなす。
 */
export function isOpenToAll(spot: Pick<Spot, 'usage_condition'>): boolean {
  const cond = spot.usage_condition;
  if (!cond) return true;
  return !/利用者のみ|要予約|完全予約|会員/.test(cond) || /地下街利用者のみ/.test(cond);
}

export const SPOT_TYPE_LABELS: Record<SpotType, string> = {
  smoking: '喫煙所',
  shop: '購入場所',
  shisha: 'シーシャ',
  cigar: '葉巻',
  cafe: '喫煙可カフェ',
  bar: '喫煙可バー',
  restaurant: '喫煙可飲食店',
};

export const SPOT_TYPE_EMOJIS: Record<SpotType, string> = {
  smoking: '🚬',
  shop: '🏪',
  shisha: '💨',
  cigar: '🍃',
  cafe: '☕',
  bar: '🍺',
  restaurant: '🍜',
};

export const SPOT_TYPE_COLORS: Record<SpotType, string> = {
  smoking: '#1a1a1a',
  shop: '#3b82f6',
  shisha: '#8b5cf6',
  cigar: '#78350f',
  cafe: '#f59e0b',
  bar: '#ef4444',
  restaurant: '#059669',
};

/**
 * 銘柄カテゴリの表示順。一覧のカテゴリチップと一覧の並び順の両方がここを見る。
 *
 * name 昇順で並べると先頭が専門店限定のシーシャ・葉巻で埋まり、45件ある紙巻きが
 * 17番目まで沈むため、カテゴリを主キーにして並べている
 */
export const BRAND_CATEGORY_ORDER: BrandCategory[] = [
  'cigarette',
  'heated',
  'shisha',
  'cigar',
  'other',
];

export const BRAND_CATEGORY_LABELS: Record<BrandCategory, string> = {
  cigarette: '紙巻きたばこ',
  heated: '加熱式たばこ',
  shisha: 'シーシャ',
  cigar: '葉巻',
  other: 'その他',
};

export const BRAND_CATEGORY_EMOJIS: Record<BrandCategory, string> = {
  cigarette: '🚬',
  heated: '🔥',
  shisha: '💨',
  cigar: '🍃',
  other: '🌿',
};

export const AVAILABILITY_LABELS: Record<Availability, string> = {
  everywhere: '全国流通',
  limited: '限定流通',
  specialty: '専門店のみ',
};
