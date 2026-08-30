/**
 * 座標から住所を引く（Mapbox Geocoding v6）。
 *
 * 住所はスポット登録の必須項目ではなく、入力欄の下書きを埋めるためだけに使う。
 * したがって失敗・タイムアウト・想定外の応答は全て null に倒し、
 * 利用者には空欄のまま手入力してもらう。ここで例外を投げてはいけない。
 *
 * 注意: 応答の形は本番でしか確認できていない（開発用のクラウド環境からは
 * api.mapbox.com に到達できない）。full_address が取れなければ
 * place_formatted に落とし、どちらも無ければ null を返す。
 */
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

    const address = props.full_address ?? props.place_formatted ?? props.name;
    return typeof address === 'string' && address.trim() ? address.trim() : null;
  } catch {
    // ネットワーク断・タイムアウト・JSON でない応答。手入力に任せる
    return null;
  }
}
