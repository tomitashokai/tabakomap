/**
 * 座標から住所を引く（Mapbox Geocoding v6）。
 *
 * 住所はスポット登録の必須項目ではなく、入力欄の下書きを埋めるためだけに使う。
 * したがって失敗・タイムアウト・想定外の応答は全て null に倒し、
 * 利用者には空欄のまま手入力してもらう。ここで例外を投げてはいけない。
 */

/**
 * Mapbox の full_address は「日本, 〒530-0005 大阪府大阪市北区中之島１丁目」の形で返る。
 * 取り込み済みの 542 件は「大阪市北区中之島1丁目」の形なので、そのまま入れると
 * 詳細ページで1件だけ書式が浮く。区の判定（extractWard）はどちらでも通るが、
 * 見た目を揃えるために国名・郵便番号・府名を落とす。
 *
 * 府名は「大阪府大阪市」の並びのときだけ落とす。他府県まで一律に消すと、
 * 大阪市外へ広げたときに市名だけが残って、どこの市か分からなくなる。
 */
function normalizeAddress(raw: string): string {
  return raw
    .replace(/^日本[,、]?\s*/, '')
    .replace(/^〒?\d{3}-?\d{4}\s*/, '')
    .replace(/^大阪府(?=大阪市)/, '')
    .trim();
}

export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!token) return null;

  const url =
    `https://api.mapbox.com/search/geocode/v6/reverse` +
    `?longitude=${lng}&latitude=${lat}&language=ja&limit=1&access_token=${token}`;

  try {
    // 位置を取ってから登録するまでの間に挟まるので、待たせすぎない
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;

    const json: unknown = await res.json();
    const props = (json as { features?: { properties?: Record<string, unknown> }[] })?.features?.[0]
      ?.properties;
    if (!props) return null;

    // full_address が本命。番地まで出ない地点では place_formatted（区まで）に落とす
    const address = props.full_address ?? props.place_formatted;
    if (typeof address !== 'string' || !address.trim()) return null;

    return normalizeAddress(address) || null;
  } catch {
    // ネットワーク断・タイムアウト・JSON でない応答。手入力に任せる
    return null;
  }
}
