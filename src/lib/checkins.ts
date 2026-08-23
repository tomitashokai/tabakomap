import { supabase } from './supabase';

/** 端末のローカル時間での「今日の 0:00」を ISO で返す */
function startOfToday(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

/** スポットの累計チェックイン数 */
export async function fetchSpotCheckinCount(spotId: string): Promise<number> {
  const { count, error } = await supabase
    .from('checkins')
    .select('id', { count: 'exact', head: true })
    .eq('spot_id', spotId);

  if (error) {
    console.error('[checkins] count failed:', error.message);
    return 0;
  }
  return count ?? 0;
}

/** そのユーザーが今日このスポットにチェックイン済みか */
export async function hasCheckedInToday(spotId: string, userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('checkins')
    .select('id')
    .eq('spot_id', spotId)
    .eq('user_id', userId)
    .gte('created_at', startOfToday())
    .limit(1);

  if (error) {
    console.error('[checkins] today lookup failed:', error.message);
    return false;
  }
  return (data?.length ?? 0) > 0;
}

export async function createCheckin(spotId: string, userId: string): Promise<boolean> {
  const { error } = await supabase.from('checkins').insert({ spot_id: spotId, user_id: userId });
  if (error) {
    console.error('[checkins] insert failed:', error.message);
    return false;
  }
  return true;
}

export interface CheckinStats {
  /** 累計チェックイン数 */
  total: number;
  /** 訪れたスポットの種類数 */
  spots: number;
  /** 今月のチェックイン数 */
  thisMonth: number;
}

export async function fetchUserCheckinStats(userId: string): Promise<CheckinStats> {
  const { data, error } = await supabase
    .from('checkins')
    .select('spot_id, created_at')
    .eq('user_id', userId);

  if (error || !data) {
    if (error) console.error('[checkins] stats failed:', error.message);
    return { total: 0, spots: 0, thisMonth: 0 };
  }

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  return {
    total: data.length,
    spots: new Set(data.map((c) => c.spot_id)).size,
    thisMonth: data.filter((c) => c.created_at >= monthStart).length,
  };
}
