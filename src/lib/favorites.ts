import { supabase } from './supabase';
import type { Spot } from './types';

/**
 * お気に入りは本人しか読めない（RLS の select も auth.uid() = user_id）。
 * したがってスポット側の「N人が保存」のような集計はここには無い。
 *
 * 失敗時の扱いは checkins.ts と揃える。console.error に出して false / 空を返し、
 * 呼び出し側は「押せなかった」ことだけ扱う。お気に入りは失われても操作を
 * やり直せるので、投げてページを落とすほどのものではない。
 */

/** unique (user_id, spot_id) 違反。既に入っているので追加としては成功と同じ */
const UNIQUE_VIOLATION = '23505';

export async function isFavorite(spotId: string, userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('favorites')
    .select('id')
    .eq('spot_id', spotId)
    .eq('user_id', userId)
    .limit(1);

  if (error) {
    console.error('[favorites] lookup failed:', error.message);
    return false;
  }
  return (data?.length ?? 0) > 0;
}

export async function addFavorite(spotId: string, userId: string): Promise<boolean> {
  const { error } = await supabase.from('favorites').insert({ spot_id: spotId, user_id: userId });

  if (error) {
    // 二重タップや2タブから同時に押した場合。★は既に付いているので失敗扱いにしない。
    // ここで false を返すと、UI が「追加できませんでした」と出しつつ実際は入っている
    if (error.code === UNIQUE_VIOLATION) return true;
    console.error('[favorites] insert failed:', error.message);
    return false;
  }
  return true;
}

/**
 * 解除。RLS 側でも本人に限られているので、他人の行を指定しても 0 件削除で終わる。
 * 既に無い場合も 0 件削除でエラーにならないため、二重解除は成功扱いになる
 */
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

/** マイページのメニューに出す件数だけ。行の中身は要らないので head で数える */
export async function fetchFavoriteCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('favorites')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);

  if (error) {
    console.error('[favorites] count failed:', error.message);
    return 0;
  }
  return count ?? 0;
}

export interface FavoriteSpot {
  spot: Spot;
  /** お気に入りに入れた日時。スポットの created_at とは別物 */
  savedAt: string;
}

/**
 * お気に入りのスポットを保存した新しい順に返す。
 *
 * spots を埋め込んで1往復で取る。favorites.spot_id → spots.id は多対一なので
 * PostgREST は配列ではなくオブジェクトを返す。spots の select は誰でも可なので
 * 埋め込み側が RLS で落ちることは無い。
 */
export async function fetchFavoriteSpots(userId: string): Promise<FavoriteSpot[]> {
  const { data, error } = await supabase
    .from('favorites')
    .select('created_at, spots(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error || !data) {
    if (error) console.error('[favorites] fetch list failed:', error.message);
    return [];
  }

  const rows = data as unknown as { created_at: string; spots: Spot | null }[];

  // spots が null になるのは参照先が消えた場合。on delete cascade があるので
  // 通常は起きないが、null をそのまま流すと一覧の描画で落ちるので捨てる
  return rows
    .filter((r): r is { created_at: string; spots: Spot } => r.spots !== null)
    .map((r) => ({ spot: r.spots, savedAt: r.created_at }));
}
