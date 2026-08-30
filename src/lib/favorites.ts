import { supabase } from './supabase';
import type { Spot } from './types';

/**
 * favorites テーブルはマイグレーション（20260830000000_favorites.sql）を
 * 適用するまで本番に存在しない。未適用のまま画面が例外で落ちないよう、
 * 読み取りは「お気に入り無し」に倒す。
 */
function isMissingTable(code: string | undefined): boolean {
  // 42P01 = undefined_table、PGRST205 = PostgREST のスキーマキャッシュに無い
  return code === '42P01' || code === 'PGRST205';
}

/** そのスポットをお気に入りに入れているか */
export async function isFavorited(spotId: string, userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('favorites')
    .select('id')
    .eq('spot_id', spotId)
    .eq('user_id', userId)
    .limit(1);

  if (error) {
    if (!isMissingTable(error.code)) console.error('[favorites] lookup failed:', error.message);
    return false;
  }
  return (data?.length ?? 0) > 0;
}

export async function addFavorite(spotId: string, userId: string): Promise<boolean> {
  const { error } = await supabase.from('favorites').insert({ spot_id: spotId, user_id: userId });
  if (error) {
    console.error('[favorites] insert failed:', error.message);
    return false;
  }
  return true;
}

export async function removeFavorite(spotId: string, userId: string): Promise<boolean> {
  const { error } = await supabase
    .from('favorites')
    .delete()
    .eq('spot_id', spotId)
    .eq('user_id', userId);

  if (error) {
    console.error('[favorites] delete failed:', error.message);
    return false;
  }
  return true;
}

/** お気に入りに入れたスポットを、登録した新しい順に返す */
export async function fetchFavoriteSpots(userId: string): Promise<Spot[]> {
  const { data, error } = await supabase
    .from('favorites')
    .select('created_at, spots(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    if (!isMissingTable(error.code)) console.error('[favorites] fetch failed:', error.message);
    return [];
  }

  // spots は 1 対 1 の参照だが、型上は配列にもなりうるので均してから取り出す
  return (data ?? []).flatMap((row) => {
    const spot = (row as { spots: Spot | Spot[] | null }).spots;
    if (!spot) return [];
    return Array.isArray(spot) ? spot : [spot];
  });
}
