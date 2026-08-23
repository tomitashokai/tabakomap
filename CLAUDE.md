@AGENTS.md

# タバコマップ

喫煙所・喫煙可能店のマップ、銘柄データベース、たばこ関連ニュースをまとめた PWA。

- 本番: https://tabakomap.vercel.app （master への push で Vercel が自動デプロイ）
- Supabase プロジェクト ref: `mtfpxjbibezuduzhoepr`

## 技術スタック

Next.js 16 (App Router) / TypeScript / Tailwind CSS / Mapbox GL JS / Supabase (PostGIS) / Vercel

```bash
npx next dev        # 開発サーバー
npx tsc --noEmit    # 型チェック
npx next build      # 本番ビルド
npx eslint src      # ※ brands/page.tsx と map/page.tsx に set-state-in-effect の
                    #   既存エラーが2件ある。新規に増やさないこと
```

## 環境変数

`.env.example` にキー名がある。値はリポジトリに入っていないので、ローカルなら `.env.local`。
`NEXT_PUBLIC_MAPBOX_TOKEN` と Supabase の2つが無いとビルドも検証も通らない。

**秘密情報をコマンドラインに直接書かないこと。** 許可したコマンドは文字列のまま
`.claude/settings.local.json` に保存されるため平文で残る。ファイルか環境変数から読ませる。

## クラウドセッション（claude.ai/code）で作業するとき

- 最初に `npm install` を走らせる。依存はクローンに含まれない
- Node は 20/21/22 が入っている。Docker や主要な言語ランタイムも利用できる
- **`SUPABASE_ACCESS_TOKEN` は無い前提で動くこと。** Cloud environment の環境変数には
  専用のシークレットストアが無く、その環境を使う人は誰でも値を読めるため置いていない。
  したがって `scripts/import-*.mjs` など DB へ書き込むスクリプトは実行できない。
  スキーマやデータを変えたいときは `supabase/migrations/` に SQL を書いてコミットし、
  適用はローカルか Supabase のダッシュボードから行う
- `scripts/screenshot.mjs` は実 Chrome に依存しているので動かない。
  見た目の確認は `npx tsc --noEmit` と `npx next build` を通したうえで、
  デプロイ後に https://tabakomap.vercel.app をブラウザで見る
- master に push すれば Vercel が自動デプロイする。ここはローカルと同じ

## DB スキーマ

### `spots`（542件）
`id, name, type, lat, lng, address, is_outdoor, is_heated, is_24h, hours, usage_condition, created_by, created_at, updated_at`

- `type`: `smoking` / `shop` / `shisha` / `cigar` / `cafe` / `bar` / `restaurant`
  - 内訳: smoking 440 / restaurant 38 / cafe 36 / bar 21 / shop 7
  - `shop` は「たばこを買える場所」の意味。単に喫煙室がある店舗を入れないこと
- `usage_condition`: 利用条件の原文（`店舗利用者のみ` / `地下街利用者のみ` / `加熱式専用` /
  `特になし` / null）。**後述の落とし穴を必ず読むこと**
- `created_by`: 投稿ユーザー。運営がインポートした分は null

### `checkins`（0件）
`id, spot_id, user_id, created_at`

### `brands`（86件）
`id, name, maker, category, tar, nicotine, price, availability, image_url, created_at`
- `name` に unique 制約 `brands_name_key`
- 価格49件が null。裏が取れなかったものは埋めずに空けてある

## RLS

全テーブルで有効。定義は `supabase/migrations/` にある。

- 閲覧は全テーブル誰でも可
- `spots` の insert は authenticated かつ `auth.uid() = created_by`。update 不可、
  delete は本人のみ。インポート分は `created_by` が null なので誰にも消せない
- `checkins` の insert/delete は `auth.uid() = user_id` の本人のみ
- `brands` は読み取り専用。投入は Management API か service_role 経由

認証は匿名サインイン（`src/components/AuthProvider.tsx`）。メール登録による昇格は未実装。

## DB を操作する手段

Supabase Management API に SQL を投げる。postgres 権限で走るので RLS を素通りする。

```
POST https://api.supabase.com/v1/projects/mtfpxjbibezuduzhoepr/database/query
Authorization: Bearer $SUPABASE_ACCESS_TOKEN
body: {"query": "<SQL>"}
```

## スクリプト

- `scripts/import-osaka.mjs` — 大阪市指定喫煙所 CSV の投入（service_role key が必要）
- `scripts/import-osaka-shops.mjs` — 大阪市の喫煙可能店126件。`--dry-run` で解析だけ確認できる。
  同名かつ座標が近い既存行は上書きするので何度流しても増えない
- `scripts/import-brands.mjs` / `scripts/brands-seed.json` — 銘柄マスタ
- `scripts/gen-icons.mjs` — 依存なしの PWA アイコン生成
- `scripts/screenshot.mjs` — 実 Chrome での目視検証。`--click` は複数指定可、`--center lat,lng`、
  `SCREENSHOT_BASE_URL` で本番も撮れる。**ローカル(Windows) 専用**：クラウドでは
  `.puppeteerrc.cjs` が `skipDownload: true` のため実 Chrome が無く動かない

## データの出典

`/about/data`（`src/app/about/data/page.tsx`）で明示している。
**データソースを足したらこのページにも追記すること。** 大阪市ホームページは
政府標準利用規約準拠で、出典明示が利用条件になっている。

喫煙可能店の元データ: https://www.city.osaka.lg.jp/kankyo/page/0000607135.html
1ページに全471施設あり、「利用条件」を持つ126件が情報提供喫煙所。緯度経度は
mapnavi リンクの URL（`mpx=` `mpy=`）から取れる。パースはレコード終端の
「喫煙所形態：屋内喫煙所/屋外開放型喫煙所/屋外閉鎖型喫煙所」で区切る。
`<strong>` 起点で割ると、名前がベタ書きの行が混在しているため壊れる。

## 落とし穴

### 業態と利用条件は別物
情報提供喫煙所には大阪トヨタ12店のように「店舗利用者のみ」の喫煙室が含まれる。
`type` だけで表現すると誰でも入れる喫煙所と区別できず、行っても吸えない場所に案内する。
**必ず `usage_condition` を見ること。** マップは `isOpenToAll()`（`src/lib/types.ts`）で
既定では誰でも立ち寄れる場所だけを出す。
- 対象外: 店舗利用者のみ / 要予約 / 会員
- 含める: 地下街利用者のみ（通りがかれば誰でも該当）、加熱式専用（吸えるものの制限で
  あって入れる人の制限ではない）、記載なし
- カフェ・バー・飲食店・購入・シーシャ・葉巻を選んだときは店舗利用が前提なので条件つきも出す
  （`STORE_TYPES`）。これが無いと「飲食店」を選んだ瞬間 0 件で行き止まりになる

### DB を変えたらデプロイまでを1セットで
本番 Supabase にスキーマやポリシーを適用したのにコードが未デプロイだと、その間ずっと
本番が壊れる。実際に RLS 適用後・コード未デプロイの状態を作り、本番のスポット登録が
全部失敗する時間帯を発生させた。**ローカルで直して「直った」と報告する前に本番も確認する。**

### 地図の日本語化は `language: 'ja'` だけで足りる
`text-field` を `coalesce(name_ja, name)` に一括置換してはいけない。`language=ja` の
タイルには `name_ja` が存在せず無意味なうえ、`airport-label`（空港コードと名称を
出し分ける step 式）を潰す。GL JS が composite ソースの URL に `language=ja` を付け、
タイルから `name_en` が丸ごと落ちるので、`coalesce(name_en, name)` が日本語に解決される。
Mapbox Static Images API は `language` を無視するので検証には使えない。

### Next.js 16
`AGENTS.md` の指示どおり `node_modules/next/dist/docs/` を読んでから書く。
fetch はデフォルトでキャッシュされないので ISR は `next: { revalidate: N }` を明示する。

### ローカル(Windows) 固有
- Bash ツールのヒアドキュメントは日本語＋長文だと壊れることがある。長いファイルは Write で書く
- Git Bash からスクリプトに `/map` のような引数を渡すと `C:/Program Files/Git/map` に化ける。
  `MSYS_NO_PATHCONV=1` を付ける
- dev サーバーを止めるときはポート指定で。`taskkill /IM node.exe` は使わない

## 残タスク

- 銘柄データの価格49件が null。JT / フィリップモリスジャパン / BATジャパンの公式で裏取りする
- 銘柄DBの並び順が name 昇順で、先頭がシーシャになり主要な紙巻きが埋もれる
- マップの「＋登録」ボタンがボトムシートに隠れ、ピンが上端のフィルターチップに重なる
- スポット追加モーダルに利用条件の入力が無く、ユーザー投稿は全部「誰でも利用可」扱いになる
- 喫煙可能店の種別は店名からの推測。業態が読めない店は restaurant に寄っている
  （`scripts/import-osaka-shops.mjs` の `TYPE_RULES` で調整可能）
- お気に入りスポット、Osaka Metro の喫煙所データ、GA / Speed Insights は未着手
- マップの spots 取得は全件読み（limit 2000）。他都市を足すなら表示範囲で絞ること
- 検証用に作った匿名ユーザーが `auth.users` に残っている
