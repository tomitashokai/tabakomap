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
