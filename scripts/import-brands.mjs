/**
 * brands-seed.json を Supabase の brands テーブルに投入する。
 *
 * brands は RLS で読み取り専用にしてあるため anon key では書けない。
 * ここでは Supabase Management API（SQL 実行）を使う。postgres 権限で走るので RLS を素通りする。
 *
 * 実行:
 *   $env:SUPABASE_ACCESS_TOKEN = "<personal access token>"   # ~/.claude/settings.json の env にも設定済み
 *   node scripts/import-brands.mjs
 *
 * name に unique 制約を張ったうえで upsert するので、何度流しても重複しない。
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const PROJECT_REF = 'mtfpxjbibezuduzhoepr';
const SEED_FILE = join(dirname(fileURLToPath(import.meta.url)), 'brands-seed.json');

const token = process.env.SUPABASE_ACCESS_TOKEN;
if (!token) {
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

const { brands } = JSON.parse(readFileSync(SEED_FILE, 'utf8'));

const errors = validate(brands);
if (errors.length) {
  console.error('シードデータが不正です:');
  errors.forEach((e) => console.error('  - ' + e));
  process.exit(1);
}

console.log(`${brands.length} 件を投入します...`);

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
  .map((b) =>
    `(${[b.name, b.maker, b.category, b.tar, b.nicotine, b.price, b.availability].map(lit).join(', ')})`
  )
  .join(',\n    ');

await runSql(`
  insert into public.brands (name, maker, category, tar, nicotine, price, availability)
  values
    ${values}
  on conflict (name) do update set
    maker        = excluded.maker,
    category     = excluded.category,
    tar          = excluded.tar,
    nicotine     = excluded.nicotine,
    price        = excluded.price,
    availability = excluded.availability;
`);

const [summary] = await runSql(`
  select
    count(*) as total,
    count(*) filter (where category = 'cigarette') as cigarette,
    count(*) filter (where category = 'heated')    as heated,
    count(*) filter (where category = 'shisha')    as shisha,
    count(*) filter (where category = 'cigar')     as cigar,
    count(*) filter (where category = 'other')     as other,
    count(*) filter (where price is null)          as price_unknown
  from public.brands;
`);

console.log('投入完了:', summary);
