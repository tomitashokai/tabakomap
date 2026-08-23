/**
 * 大阪市「市内の喫煙可能な場所について」から「情報提供喫煙所」を取り込む。
 * https://www.city.osaka.lg.jp/kankyo/page/0000607135.html
 *
 * 大阪市指定喫煙所（＝ scripts/import-osaka.mjs で投入済みの444件）とは別枠の、
 * 店舗利用者向けに開放されている喫煙可能店・喫煙室のデータ。
 *
 * ライセンス: 大阪市ホームページのコンテンツは政府標準利用規約準拠で、出典明示のうえ
 * 複製・公衆送信・翻案・商用利用が可能。
 * 出典: 大阪市ホームページ（https://www.city.osaka.lg.jp/kankyo/page/0000607135.html）
 *
 * 実行:
 *   $env:SUPABASE_ACCESS_TOKEN = "<personal access token>"
 *   node scripts/import-osaka-shops.mjs            # 取り込み
 *   node scripts/import-osaka-shops.mjs --dry-run  # 解析結果だけ表示（DBに触らない）
 *
 * 投入は Supabase Management API（postgres 権限）で行うので RLS を素通りする。
 * created_by は null のまま＝運営投入扱いになり、RLS 上どのユーザーにも削除されない。
 */
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { writeFileSync } from 'node:fs';

const SOURCE_URL = 'https://www.city.osaka.lg.jp/kankyo/page/0000607135.html';
const PROJECT_REF = 'mtfpxjbibezuduzhoepr';
const DRY_RUN = process.argv.includes('--dry-run');

/** 喫煙所形態の取りうる値。レコードの終端マーカーとして使う */
const FORMS = ['屋内喫煙所', '屋外開放型喫煙所', '屋外閉鎖型喫煙所'];

// ---------------------------------------------------------------- パース

/**
 * HTML を素のテキストに畳む。ただし
 * - mapnavi リンクの URL に入っている緯度経度は ⟦lat,lng⟧ として本文に残す
 * - 見出しは ⟪…⟫ として残す
 */
function flatten(html) {
  return html
    .replace(
      /<a[^>]+href="[^"]*mapnavi[^"]*mpx=([\d.]+)&(?:amp;)?mpy=([\d.]+)[^"]*"[^>]*>([\s\S]*?)<\/a>/g,
      (_, lng, lat, text) => `${text.replace(/<[^>]+>/g, '')}⟦${lat},${lng}⟧`
    )
    .replace(/<h[23][^>]*>([\s\S]*?)<\/h[23]>/g, (_, t) => `⟪${t.replace(/<[^>]+>/g, '').trim()}⟫`)
    .replace(/<br\s*\/?>/g, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"')
    .replace(/[ \t　]+/g, ' ')
    .replace(/\n\s*/g, '\n');
}

function pickField(body, label) {
  const re = new RegExp(
    `${label}[^：]*：\\s*([\\s\\S]*?)(?=\\n?(?:利用条件|所在地|面積|供用時間|備考|喫煙所形態)[^：]*：|$)`
  );
  const m = body.match(re);
  return m ? m[1].replace(/\s+/g, ' ').trim() : null;
}

/**
 * 施設レコードに分解する。
 * 各レコードは必ず「喫煙所形態：<形態>」で終わるので、そこを区切りにすれば
 * 名前が <strong> に入っている行とベタ書きの行が混在していても正しく割れる。
 */
function parse(html) {
  const text = flatten(html);
  const splitter = new RegExp(`喫煙所形態：\\s*(${FORMS.join('|')})`, 'g');

  const records = [];
  let last = 0;
  for (const m of text.matchAll(splitter)) {
    const chunk = text.slice(last, m.index);
    last = m.index + m[0].length;

    // 見出しより後ろだけを対象にする（前の区の残骸を拾わないため）
    const headEnd = chunk.lastIndexOf('⟫');
    const body = headEnd === -1 ? chunk : chunk.slice(headEnd + 1);

    const cond = pickField(body, '利用条件');
    const addrRaw = pickField(body, '所在地');
    const hours = pickField(body, '供用時間');
    const area = pickField(body, '面積');

    // 名前は最初のフィールドラベルより前の、最後の非空行
    const nameRaw = body.split(/利用条件：|所在地：/)[0]
      .split('\n').map((s) => s.trim()).filter(Boolean).pop() ?? '';

    const coord = (addrRaw ?? '').match(/⟦([\d.]+),([\d.]+)⟧/);

    records.push({
      name: nameRaw.replace(/⟦[^⟧]*⟧/g, '').trim(),
      cond,
      addr: addrRaw?.replace(/⟦[^⟧]*⟧/g, '').trim() ?? null,
      hours,
      area,
      form: m[1],
      lat: coord ? +coord[1] : null,
      lng: coord ? +coord[2] : null,
    });
  }
  return records;
}

// ---------------------------------------------------------------- 分類

/**
 * 店名から種別を決める。上から順に最初に当たったものを採用する。
 * 「ロックカフェ」のようにバーだがカフェを名乗る店もあるが、看板どおりに寄せる。
 */
const TYPE_RULES = [
  // 地下街や施設内の喫煙室、および「店舗利用者向けの喫煙室があるだけ」の非飲食施設。
  // 自動車ディーラーやネットカフェを shop にすると「購入場所（＝たばこが買える）」の
  // 意味とずれるので、こちらに寄せる
  ['smoking', /喫煙室|喫煙所|Smoking Area|SMOKING|喫煙スペース/i],
  ['smoking', /トヨタ|カーショップ|自動車|ネットカフェ|アプレシオ|快活|パチンコ|キコーナ|マルハン|テニス|スポーツ|公園|パーク/i],
  ['cafe', /カフェ|CAFE|Cafe|珈琲|coffee|コーヒー|喫茶|タリーズ|ドトール|コメダ|スターバックス/i],
  // shop は「たばこを買える場所」。実際に販売しているコンビニ・たばこ店に限る
  ['shop', /ファミリーマート|ローソン|セブン－イレブン|セブンイレブン|ミニストップ|デイリーヤマザキ|たばこ店|タバコ店/i],
  ['bar', /バー|バル|BAR|Bar|ラウンジ|スナック|クラブ|居酒屋|酒場|立ち呑み|立呑|立飲|焼酎|酒屋|ダイニング|パブ|PUB|ライブ|ミュージック/i],
  ['shisha', /シーシャ|水タバコ|SHISHA/i],
  ['cigar', /葉巻|シガー|CIGAR/i],
];

function classify(name) {
  for (const [type, re] of TYPE_RULES) {
    if (re.test(name)) return type;
  }
  // 情報提供喫煙所に残るのはほぼ飲食店（お好み焼き・焼肉・ラーメン・寿司など）
  return 'restaurant';
}

/** 「（店舗全面喫煙可能）」などの注記を名前から外し、備考として返す */
function splitName(name) {
  const notes = [];
  const cleaned = name.replace(/（([^）]*(?:喫煙可能|喫煙可)[^）]*)）/g, (_, n) => {
    notes.push(n);
    return '';
  }).trim();
  return { name: cleaned || name, notes };
}

function toSpot(rec) {
  const { name, notes } = splitName(rec.name);
  const cond = rec.cond ?? '';

  const hoursParts = [];
  if (rec.hours) hoursParts.push(rec.hours);
  if (notes.length) hoursParts.push(notes.join('、'));

  return {
    name,
    type: classify(name),
    lat: rec.lat,
    lng: rec.lng,
    address: rec.addr,
    is_outdoor: rec.form.startsWith('屋外'),
    // 「加熱式専用」と明示されているものだけ true。それ以外は不明なので false のまま
    is_heated: /加熱式/.test(cond),
    is_24h: /終日|24時間/.test(rec.hours ?? ''),
    hours: hoursParts.join(' / ') || null,
    // 誰でも入れるのか店舗利用者に限るのかは、この店を出すかどうかを左右する情報なので
    // hours に混ぜず独立して持つ
    usage_condition: cond || null,
  };
}

// ---------------------------------------------------------------- DB

const token = process.env.SUPABASE_ACCESS_TOKEN;

async function runSql(sql) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${text}`);
  return JSON.parse(text);
}

function lit(v) {
  if (v === null || v === undefined) return 'null';
  if (typeof v === 'number') return String(v);
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  return `'${String(v).replace(/'/g, "''")}'`;
}

// ---------------------------------------------------------------- 本体

const html = await (await fetch(SOURCE_URL, { headers: { 'User-Agent': 'tabakomap-importer' } })).text();
const all = parse(html);

// 「利用条件」を持つものが情報提供喫煙所。指定喫煙所には利用条件が無い
const shops = all.filter((r) => r.cond && r.name && r.lat != null && r.lng != null);

console.log(`解析: 全 ${all.length} 施設 / うち情報提供喫煙所 ${shops.length} 件`);

const spots = shops.map(toSpot);

const byType = {};
spots.forEach((s) => { byType[s.type] = (byType[s.type] ?? 0) + 1; });
console.log('種別の内訳:', byType);

// 座標が大阪市の範囲に入っているか（パース事故の検知）
const outOfRange = spots.filter((s) => s.lat < 34.5 || s.lat > 34.85 || s.lng < 135.3 || s.lng > 135.7);
if (outOfRange.length) {
  console.error(`座標が大阪市の範囲外: ${outOfRange.length} 件`);
  outOfRange.slice(0, 5).forEach((s) => console.error(`  ${s.name} (${s.lat}, ${s.lng})`));
  process.exit(1);
}

if (DRY_RUN) {
  const out = join(dirname(fileURLToPath(import.meta.url)), 'osaka-shops-preview.json');
  writeFileSync(out, JSON.stringify(spots, null, 2), 'utf8');
  console.log(`\n--dry-run のため DB には投入しません。解析結果を ${out} に書き出しました。`);
  spots.slice(0, 10).forEach((s) =>
    console.log(`  [${s.type}] ${s.name} / ${s.address} / ${s.hours}`)
  );
  process.exit(0);
}

if (!token) {
  console.error('SUPABASE_ACCESS_TOKEN が未設定です。');
  process.exit(1);
}

// 大阪市指定喫煙所の CSV（444件）にも同じ店舗が smoking 型で入っているものがある。
// 名前が一致するものは飛ばさずに、種別・住所・供用時間を上書きして揃える。
const existing = new Set(
  (await runSql('select name from public.spots')).map((r) => r.name)
);
const fresh = spots.filter((s) => !existing.has(s.name));
const dupes = spots.filter((s) => existing.has(s.name));
console.log(`既存 ${existing.size} 件 / 新規 ${fresh.length} 件 / 既存を更新 ${dupes.length} 件`);

const row = (s) =>
  `(${[s.name, s.type, s.lat, s.lng, s.address, s.is_outdoor, s.is_heated, s.is_24h, s.hours, s.usage_condition]
    .map(lit).join(', ')})`;

if (fresh.length) {
  await runSql(`
    insert into public.spots
      (name, type, lat, lng, address, is_outdoor, is_heated, is_24h, hours, usage_condition)
    values
      ${fresh.map(row).join(',\n      ')};
  `);
}

if (dupes.length) {
  // 同名でも別地点なら別施設なので、座標が近いものだけ更新する
  const updated = await runSql(`
    update public.spots s set
      type            = v.type,
      address         = v.address,
      is_outdoor      = v.is_outdoor,
      is_heated       = v.is_heated,
      is_24h          = v.is_24h,
      hours           = v.hours,
      usage_condition = v.usage_condition,
      updated_at      = now()
    from (values
      ${dupes.map(row).join(',\n      ')}
    ) as v(name, type, lat, lng, address, is_outdoor, is_heated, is_24h, hours, usage_condition)
    where s.name = v.name
      and abs(s.lat - v.lat) < 0.002
      and abs(s.lng - v.lng) < 0.002
    returning s.name;
  `);
  console.log(`  実際に更新された行: ${updated.length} 件`);
}

const [summary] = await runSql(`
  select count(*) as total,
    count(*) filter (where type = 'restaurant') as restaurant,
    count(*) filter (where type = 'cafe')       as cafe,
    count(*) filter (where type = 'bar')        as bar,
    count(*) filter (where type = 'shop')       as shop,
    count(*) filter (where type = 'smoking')    as smoking
  from public.spots;
`);
console.log('投入完了。spots の現況:', summary);
