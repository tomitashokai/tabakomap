/**
 * brands-seed.json を Supabase の brands テーブルに投入する。
 *
 * brands は RLS で読み取り専用にしてあるため anon key では書けない。
 * ここでは Supabase Management API（SQL 実行）を使う。postgres 権限で走るので RLS を素通りする。
 *
 * 実行:
 *   $env:SUPABASE_ACCESS_TOKEN = "<personal access token>"   # ~/.claude/settings.json の env にも設定済み
 *   node scripts/import-brands.mjs
 *   node scripts/import-brands.mjs --dry-run   # 突き合わせ結果だけ表示（DB に触らない）
 *
 * name に unique 制約を張ったうえで upsert するので、何度流しても重複しない。
 *
 * 価格は2種類ある。**シードの price は実在 SKU の定価ではなく生成された概算**なので、
 * 公式カタログ・公式プレスリリースで現物を確認できた分を brand-prices-verified.json で
 * 上書きし、その行だけ price_source と price_as_of を入れる。出典が入らない行は
 * 参考価格であり、画面側（isVerifiedPrice）で定価として扱わない。
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const PROJECT_REF = 'mtfpxjbibezuduzhoepr';
const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const SEED_FILE = join(SCRIPT_DIR, 'brands-seed.json');
const VERIFIED_FILE = join(SCRIPT_DIR, 'brand-prices-verified.json');

const DRY_RUN = process.argv.includes('--dry-run');

const token = process.env.SUPABASE_ACCESS_TOKEN;
if (!token && !DRY_RUN) {
  console.error('SUPABASE_ACCESS_TOKEN が未設定です。');
  process.exit(1);
}

/** SQL のリテラルに埋める（文字列はシングルクォートをエスケープ、null/数値はそのまま） */
function lit(v) {
  if (v === null || v === undefined) return 'null';
  if (typeof v === 'number') return String(v);
  return `'${String(v).replace(/'/g, "''")}'`;
}

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

const CATEGORIES = ['cigarette', 'heated', 'shisha', 'cigar', 'other'];
const AVAILABILITIES = ['everywhere', 'limited', 'specialty'];

function validate(brands) {
  const errors = [];
  const seen = new Set();
  brands.forEach((b, i) => {
    const where = `[${i}] ${b.name ?? '(no name)'}`;
    if (!b.name) errors.push(`${where}: name が空`);
    if (seen.has(b.name)) errors.push(`${where}: name が重複`);
    seen.add(b.name);
    if (b.category && !CATEGORIES.includes(b.category)) errors.push(`${where}: category が不正 (${b.category})`);
    if (b.availability && !AVAILABILITIES.includes(b.availability)) {
      errors.push(`${where}: availability が不正 (${b.availability})`);
    }
    if (b.tar != null && !Number.isInteger(b.tar)) errors.push(`${where}: tar は整数のみ (${b.tar})`);
  });
  return errors;
}

/**
 * 裏の取れた定価をシードに載せる。
 *
 * verified 側の name はシードの name と一致していなければならない（official_name は
 * 突き合わせた公式表記の記録用で、照合には使わない）。**一致しない項目は捨てずに
 * エラーで落とす。** 黙って無視すると、銘柄名を直したときに上書きが外れたことに
 * 気づけず、参考価格が定価として出続ける。
 */
function mergeVerifiedPrices(brands, verified) {
  const byName = new Map(verified.prices.map((p) => [p.name, p]));

  const unmatched = [...byName.keys()].filter((n) => !brands.some((b) => b.name === n));
  if (unmatched.length) {
    console.error('brand-prices-verified.json の銘柄名がシードに見つかりません:');
    unmatched.forEach((n) => console.error('  - ' + n));
    process.exit(1);
  }

  return brands.map((b) => {
    const v = byName.get(b.name);
    if (!v) return { ...b, price_as_of: null, price_source: null };
    return { ...b, price: v.price, price_as_of: v.as_of ?? verified.as_of, price_source: v.source };
  });
}

const seed = JSON.parse(readFileSync(SEED_FILE, 'utf8')).brands;
const verified = JSON.parse(readFileSync(VERIFIED_FILE, 'utf8'));

const errors = validate(seed);
if (errors.length) {
  console.error('シードデータが不正です:');
  errors.forEach((e) => console.error('  - ' + e));
  process.exit(1);
}

const brands = mergeVerifiedPrices(seed, verified);

const verifiedCount = brands.filter((b) => b.price_source).length;
const referenceCount = brands.filter((b) => !b.price_source && b.price != null).length;
console.log(
  `${brands.length} 件を投入します（定価 ${verifiedCount} 件 / 参考価格 ${referenceCount} 件 / ` +
    `価格なし ${brands.length - verifiedCount - referenceCount} 件）...`
);

if (DRY_RUN) {
  for (const b of brands.filter((x) => x.price_source)) {
    console.log(`  定価 ${String(b.price).padStart(4)}円  ${b.price_source} ${b.price_as_of}  ${b.name}`);
  }
  console.log('\n--dry-run のため DB には投入しません。');
  process.exit(0);
}

/*
 * 出典の2列が無い DB に流すと insert が HTTP 400 の
 * `column "price_as_of" of relation "brands" does not exist` で落ちる。
 * 原因がマイグレーション未適用だと分かる文言に置き換える
 */
const [cols] = await runSql(`
  select count(*) as n from information_schema.columns
  where table_schema = 'public' and table_name = 'brands'
    and column_name in ('price_as_of', 'price_source');
`);
if (Number(cols.n) < 2) {
  console.error(
    'brands に price_as_of / price_source がありません。\n' +
      'supabase/migrations/20260902000000_brand_price_provenance.sql を先に適用してください。'
  );
  process.exit(1);
}

// 何度流しても重複しないように name へ unique 制約を張る
await runSql(`
  do $$
  begin
    if not exists (
      select 1 from pg_constraint where conrelid = 'public.brands'::regclass and conname = 'brands_name_key'
    ) then
      alter table public.brands add constraint brands_name_key unique (name);
    end if;
  end $$;
`);

const values = brands
  .map(
    (b) =>
      `(${[b.name, b.maker, b.category, b.tar, b.nicotine, b.price, b.availability]
        .map(lit)
        .join(', ')}, ${lit(b.price_as_of)}::date, ${lit(b.price_source)})`
  )
  .join(',\n    ');

// price_as_of / price_source も毎回上書きする。裏取りを取り下げた銘柄が
// 出典を持ったままになると、参考価格に戻したつもりが定価として出続ける
await runSql(`
  insert into public.brands
    (name, maker, category, tar, nicotine, price, availability, price_as_of, price_source)
  values
    ${values}
  on conflict (name) do update set
    maker        = excluded.maker,
    category     = excluded.category,
    tar          = excluded.tar,
    nicotine     = excluded.nicotine,
    price        = excluded.price,
    availability = excluded.availability,
    price_as_of  = excluded.price_as_of,
    price_source = excluded.price_source;
`);

const [summary] = await runSql(`
  select
    count(*) as total,
    count(*) filter (where category = 'cigarette') as cigarette,
    count(*) filter (where category = 'heated')    as heated,
    count(*) filter (where category = 'shisha')    as shisha,
    count(*) filter (where category = 'cigar')     as cigar,
    count(*) filter (where category = 'other')     as other,
    count(*) filter (where price is null)          as price_unknown,
    count(*) filter (where price_source is not null)                 as price_official,
    count(*) filter (where price_source is null and price is not null) as price_reference
  from public.brands;
`);

console.log('投入完了:', summary);
