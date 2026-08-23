import type { Spot } from './types';

/** 「大阪市○○区」の区名部分だけを取り出す。マッチしなければ null */
export function extractWard(address: string | null): string | null {
  if (!address) return null;
  const m = address.match(/大阪市([^\s"、，,0-9０-９]{1,5}区)/);
  return m ? m[1] : null;
}

export interface WardGroup {
  ward: string;
  spots: Spot[];
}

/** スポットを区ごとにまとめる。区が読み取れないものは含めない */
export function groupByWard(spots: Spot[]): WardGroup[] {
  const map = new Map<string, Spot[]>();
  for (const spot of spots) {
    const ward = extractWard(spot.address);
    if (!ward) continue;
    const list = map.get(ward);
    if (list) list.push(spot);
    else map.set(ward, [spot]);
  }
  return [...map.entries()]
    .map(([ward, spots]) => ({ ward, spots }))
    .sort((a, b) => b.spots.length - a.spots.length);
}
