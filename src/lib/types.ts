export type SpotType = 'smoking' | 'shop' | 'shisha' | 'cigar' | 'cafe' | 'bar';
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

export const SPOT_TYPE_LABELS: Record<SpotType, string> = {
  smoking: '喫煙所',
  shop: '購入場所',
  shisha: 'シーシャ',
  cigar: '葉巻',
  cafe: '喫煙可カフェ',
  bar: '喫煙可バー',
};

export const SPOT_TYPE_EMOJIS: Record<SpotType, string> = {
  smoking: '🚬',
  shop: '🏪',
  shisha: '💨',
  cigar: '🍃',
  cafe: '☕',
  bar: '🍺',
};

export const SPOT_TYPE_COLORS: Record<SpotType, string> = {
  smoking: '#1a1a1a',
  shop: '#3b82f6',
  shisha: '#8b5cf6',
  cigar: '#78350f',
  cafe: '#f59e0b',
  bar: '#ef4444',
};
