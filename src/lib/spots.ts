import { supabase } from './supabase';
import type { Spot } from './types';

/** 大阪市内は 542 件あるので全件読み（他都市を足すなら表示範囲で絞ること） */
export async function fetchAllSpots(): Promise<Spot[]> {
  const { data, error } = await supabase.from('spots').select('*').limit(2000);
  if (error) {
    console.error('[spots] fetch all failed:', error.message);
    return [];
  }
  return (data ?? []) as Spot[];
}

/**
 * 「大阪市○○区」を住所に含むスポットだけを取る。
 * 区ページで 542 件を読んでから 1 区に絞るのは無駄なので DB 側に任せる
 */
export async function fetchSpotsByWard(ward: string): Promise<Spot[]> {
  // ilike のパターン文字を名前として渡さない（区名に入る想定は無いが、URL 由来の値なので）
  const escaped = ward.replace(/[\\%_]/g, (c) => `\\${c}`);
  const { data, error } = await supabase
    .from('spots')
    .select('*')
    .ilike('address', `%大阪市${escaped}%`)
    .limit(2000);

  if (error) {
    console.error('[spots] fetch by ward failed:', error.message);
    return [];
  }
  return (data ?? []) as Spot[];
}

/** id 指定でスポット1件を取得。無ければ null */
export async function fetchSpotById(id: string): Promise<Spot | null> {
  const { data, error } = await supabase.from('spots').select('*').eq('id', id).maybeSingle();
  if (error) {
    console.error('[spots] fetch by id failed:', error.message);
    return null;
  }
  return data as Spot | null;
}

/** そのユーザーが投稿したスポットを新しい順に返す */
export async function fetchSpotsByUser(userId: string): Promise<Spot[]> {
  const { data, error } = await supabase
    .from('spots')
    .select('*')
    .eq('created_by', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[spots] fetch by user failed:', error.message);
    return [];
  }
  return (data ?? []) as Spot[];
}

/**
 * 自分が投稿したスポットを取り下げる。
 * RLS 側でも created_by = auth.uid() を要求しているので、他人のスポットは 0 件更新で終わる。
 */
export async function deleteSpot(spotId: string): Promise<boolean> {
  const { error } = await supabase.from('spots').delete().eq('id', spotId);
  if (error) {
    console.error('[spots] delete failed:', error.message);
    return false;
  }
  return true;
}
