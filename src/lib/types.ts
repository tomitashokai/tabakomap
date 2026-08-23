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
  availability: Availability | null;
  image_url: string | null;
  created_at: string;
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
