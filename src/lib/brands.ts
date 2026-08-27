import { supabasePublic } from './supabase-cached';
import type { Brand } from './types';

/*
 * 銘柄の公開ページ（/brands/[id], sitemap.xml）用。spots.ts と同じ方針で
 * キャッシュ付きの supabasePublic を使い、失敗時は空配列や null を返さず投げる。
 * 一時的な DB エラーを「0件」や「存在しない」としてキャッシュに焼き付けると、
 * それが1時間そのまま配られてしまう。
 */

/** 86件あるので全件読み。sitemap と関連銘柄の算出に使う */
export async function fetchAllBrands(): Promise<Brand[]> {
  const { data, error } = await supabasePublic.from('brands').select('*').limit(500);
  if (error) throw new Error(`[brands] fetch all failed: ${error.message}`);
  return (data ?? []) as Brand[];
}

/** id 指定で銘柄1件を取得。該当が無ければ null（エラーとは区別する） */
export async function fetchBrandById(id: string): Promise<Brand | null> {
  const { data, error } = await supabasePublic
    .from('brands')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(`[brands] fetch by id failed: ${error.message}`);
  return data as Brand | null;
}

/**
 * シリーズ名の当たりを付けるためのキー。「セブンスター・メンソール・8」なら
 * 「セブンスター」、「テリア・ミント（IQOS用）」なら「テリア」。
 *
 * 表示には使わず、関連銘柄が同じシリーズで埋まるのを防ぐためだけに使う。
 * 「アル・ファーヒル ミント」が「アル」になるような粗い分割だが、同じ Al Fakher の
 * 銘柄同士は同じキーに落ちるので目的は果たせる
 */
function seriesKey(name: string): string {
  return name.split(/[・\s（(]/)[0];
}

/**
 * 同じカテゴリの銘柄から回遊先を選ぶ。
 *
 * 名前順に並べて上から詰めると、紙巻き45件ではメビウス7種、加熱式ではテリア6種で
 * 埋まってしまい回遊先として役に立たない。同じシリーズを先頭に少しだけ置き
 * （セブンスターを見ている人はセブンスター・メンソールも見たいはず）、
 * 残りはシリーズ違いで埋める。
 */
export function pickRelated(all: Brand[], current: Brand, limit = 8): Brand[] {
  const byName = (a: Brand, b: Brand) => a.name.localeCompare(b.name, 'ja');
  const others = all.filter((b) => b.id !== current.id).sort(byName);

  const currentSeries = seriesKey(current.name);
  const sameSeries = others.filter((b) => seriesKey(b.name) === currentSeries);
  const otherSeries = others.filter((b) => seriesKey(b.name) !== currentSeries);

  /** 同シリーズは3件まで。これ以上入れると結局同じ顔ぶれになる */
  const picked = sameSeries.slice(0, 3);
  const usedSeries = new Set([currentSeries]);

  for (const b of otherSeries) {
    if (picked.length >= limit) break;
    const key = seriesKey(b.name);
    if (usedSeries.has(key)) continue;
    usedSeries.add(key);
    picked.push(b);
  }

  // シリーズ数が足りないカテゴリ（葉巻・その他など）はここで埋める
  for (const b of [...sameSeries.slice(3), ...otherSeries]) {
    if (picked.length >= limit) break;
    if (!picked.includes(b)) picked.push(b);
  }

  return picked;
}

/**
 * 同じカテゴリの他の銘柄。詳細ページの回遊先に出す。
 *
 * DB 側で limit を掛けてはいけない。並べ替える前に任意の8件へ絞られ、
 * 同じシリーズばかりが返る。カテゴリ最大45件なので全件読んでから選ぶ。
 *
 * category が null の銘柄には関連を出さない。null 同士を「同じ仲間」として
 * 束ねると、無関係な銘柄が並んでしまう
 */
export async function fetchRelatedBrands(current: Brand, limit = 8): Promise<Brand[]> {
  if (!current.category) return [];

  const { data, error } = await supabasePublic
    .from('brands')
    .select('*')
    .eq('category', current.category)
    .limit(200);
  if (error) throw new Error(`[brands] fetch related failed: ${error.message}`);

  return pickRelated((data ?? []) as Brand[], current, limit);
}
