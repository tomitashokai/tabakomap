/**
 * supabase/migrations/ の SQL を本番 Supabase に適用する。
 *
 * Supabase Management API に投げる。postgres 権限で走るので RLS を素通りする。
 * CLI や supabase link は使っていないので、これがローカルからの適用手段になる。
 *
 * 実行:
 *   $env:SUPABASE_ACCESS_TOKEN = "<personal access token>"   # ~/.claude/settings.json の env にも設定済み
 *   node scripts/apply-migration.mjs supabase/migrations/20260902000000_brand_price_provenance.sql
 *   node scripts/apply-migration.mjs <file> --dry-run        # 投げる SQL を表示するだけ
 *
 * **トークンをコマンドラインに書かないこと。** 許可したコマンドは文字列のまま
 * .claude/settings.local.json に平文で残る（CLAUDE.md 参照）。ここでは env から読む。
 *
 * マイグレーションは冪等に書くこと（`if not exists` / `create or replace` /
 * `drop policy if exists`）。このスクリプトは適用済みかどうかを記録しないので、
 * 同じファイルを二度流しても壊れないことが前提になる。
 */
import { readFileSync } from 'node:fs';

const PROJECT_REF = 'mtfpxjbibezuduzhoepr';

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const file = args.find((a) => !a.startsWith('--'));

if (!file) {
  console.error('使い方: node scripts/apply-migration.mjs <supabase/migrations/*.sql> [--dry-run]');
  process.exit(1);
}

const sql = readFileSync(file, 'utf8');

if (DRY_RUN) {
  console.log(`--- ${file} ---\n${sql}\n--dry-run のため適用しません。`);
  process.exit(0);
}

const token = process.env.SUPABASE_ACCESS_TOKEN;
if (!token) {
  console.error('SUPABASE_ACCESS_TOKEN が未設定です。');
  process.exit(1);
}

const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ query: sql }),
});

const text = await res.text();
if (!res.ok) {
  console.error(`適用に失敗しました。HTTP ${res.status}: ${text}`);
  process.exit(1);
}

console.log(`適用しました: ${file}`);
console.log(text);
