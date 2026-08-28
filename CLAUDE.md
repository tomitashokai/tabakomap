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
npx eslint src      # エラー0・警告0。増やさないこと（一覧の絞り込みは useEffect + setState
                    # ではなく useMemo の派生値で書く。前者は set-state-in-effect で落ちる）
```

## 環境変数

`.env.example` にキー名がある。値はリポジトリに入っていないので、ローカルなら `.env.local`。
`NEXT_PUBLIC_MAPBOX_TOKEN` と Supabase の2つが無いとビルドも検証も通らない。

`NEXT_PUBLIC_GA_ID` は任意で、未設定なら GA のタグを描画しない。ローカルには入れないこと
（自分のアクセスが本番の数値に混ざる）。**ローカル検証だけならダミー値で足りる。**
`NEXT_PUBLIC_SUPABASE_URL=https://dummy.supabase.co` などを渡せば `next build` は
コンパイルと型チェックを通過し、dev サーバーも起動して DB を見ないページは検証できる。
ただし DB を読むページのプリレンダーはそこで落ちるので、実データの検証にはならない。

**`.env.local` を無くしても本番から復元できる。** anon key と Mapbox トークンは
`next build` でクライアントバンドルに埋め込まれるので、本番の `/_next/static/.../*.js` を
落として `sb_publishable_` と `pk.eyJ` を拾えばよい（どちらも公開前提の値）。

**秘密情報をコマンドラインに直接書かないこと。** 許可したコマンドは文字列のまま
`.claude/settings.local.json` に保存されるため平文で残る。ファイルか環境変数から読ませる。

## クラウドセッション（claude.ai/code）で作業するとき

- 依存のインストールは `.claude/settings.json` の SessionStart フックが
  `scripts/install_pkgs.sh` を呼んで自動で行う。`CLAUDE_CODE_REMOTE` を見て
  クラウドでだけ走るので、ローカルでは何もしない
- **クラウド環境の「セットアップスクリプト」に `npm install` を書かないこと。**
  あれはリポジトリのクローン前に走るため `package.json` が無く ENOENT で落ちる。
  依存の導入は SessionStart フック側の仕事
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
  `--type <文字列>` で最初の input に打ち込める（検索欄の検証用。`--click` より先に走る）、
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
- **検索中も条件つきを対象にする。** 「トヨタ」で探すと該当13件は全部「店舗利用者のみ」で、
  既定の絞り込みを掛けたままだと 0 件になり、DB にあるのに壊れているように見える。
  名指しで探す行為は「browse」ではなく「lookup」なので通す。条件はカードと詳細に
  出るので誤誘導にはならない

### マップの重なりは定数から計算する
BottomNav は fixed / zIndex 100 / 高さ 72。近くのスポットのシート（zIndex 20 / 高さ 220）は
その上に載せ、登録ボタンと現在地ボタン（zIndex 30）はさらにシートの上に出す。
`bottom` をベタ書きすると片方だけ動かしたときにまた隠れる。実際 `bottom: 200` の
ボタンが高さ 220 のシートに飲み込まれて押せない状態になっていた。
`src/app/map/page.tsx` の `NAV_HEIGHT` / `SHEET_HEIGHT` / `ABOVE_SHEET` から計算すること。
MapView に渡す `padding` も同じ定数から作る。これが無いと現在地へ `easeTo` したとき
ピンが上端のフィルターチップの下に潜る。

### 価格は改定が続いている。埋める前に改定日を見る
2026年はたばこの小売定価が何度も動いている。2026-08-28 時点で判明している範囲:

- **加熱式は 2026-04-01 と 2026-10-01 の二段階。** 10/1 にテリア 620→640、
  センティア 570→590。プルーム用も同時期に上がる
- **PMJ の紙巻き18銘柄は 2026-09-01 に改定。** パーラメント100系 620→640、
  フィリップモリス 450→470、バージニア・エス 570→590
- JT の紙巻きは 2026-07-01 にキャメル・クラフトとアメスピが20円上げ（アメスピ 420→440）。
  紙巻きの本格増税は 2027-04 から

改定日の直前に埋めると数日で古くなる。**まとめて入れるなら改定日の直後にすること。**

出典の取り方: JT（jti.co.jp）は UA を変えても 403 を返し自動取得できない。PMJ は
`https://www.pmi.com/content/dam/pmicom/markets/japan/docs/` にプレスリリースの PDF が
置いてあり curl で取れる（`pypdf` でテキストを抜ける）。glo / IQOS の公式は年齢認証で
リダイレクトするため WebFetch では読めない。

**シードの銘柄名がメーカーの現行ラインナップと合っていないものがある。**
「パーラメント・アクア・5」「バージニア・エス・メンソール・ワン」は PMJ の現行18銘柄に
含まれておらず終売の可能性が高い。価格が欠けているのではなく、行そのものを見直すこと。

### スポット登録モーダルは自分で現在地を取りに行く
`AddSpotModal` は `userLocation` プロップが空なら、開いた時点で
`getCurrentPosition` を呼ぶ。**プロップ任せに戻してはいけない。**
以前は「現在地ボタンを押してください」と促すだけだったが、その 📍 ボタンは
モーダルの裏にあって押せず、外をタップすると閉じて入力が消える。つまり登録するには
入力を捨てて 📍 を押し、開き直して全部打ち直すしかなかった。
失敗理由は `GEO_ERRORS` で code ごとに言い分ける（拒否・測位不能・タイムアウトを
同じ文言にすると、次に何をすればよいか分からない）。

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

### 銘柄一覧の並び順はカテゴリ順。DB の order には戻さない
`.order('name')` に戻すと先頭が専門店限定のシーシャ・葉巻で埋まり、45件ある紙巻きが
17番目まで沈む。`.order('category')` でも直らない（アルファベット順で cigar が先頭）。
カテゴリの任意順は PostgREST で表現できないので、`src/app/brands/page.tsx` の
`byCategoryThenName` で取得後にクライアント側で並べる。順序は `types.ts` の
`BRAND_CATEGORY_ORDER` が単一の出所で、カテゴリチップも一覧もそこを見る。

### 並べ替える前に DB 側で limit を掛けない
関連銘柄を `.eq('category', c).limit(8)` で取ったら、紙巻きはメビウス7種、加熱式は
テリア6種で埋まった。順序を指定していないので任意の8件が返り、そのあと名前順に
並べても顔ぶれは変わらない。回遊先としては役に立たない。
`src/lib/brands.ts` の `pickRelated` でカテゴリ全件（最大45件）から選び直している。
同シリーズを3件までに抑え、残りはシリーズ違いで埋める。

### Next.js 16
`AGENTS.md` の指示どおり `node_modules/next/dist/docs/` を読んでから書く。
fetch はデフォルトでキャッシュされないので ISR は `next: { revalidate: N }` を明示する。

### ローカル(Windows) 固有
- Bash ツールのヒアドキュメントは日本語＋長文だと壊れることがある。長いファイルは Write で書く
- Git Bash からスクリプトに `/map` のような引数を渡すと `C:/Program Files/Git/map` に化ける。
  `MSYS_NO_PATHCONV=1` を付ける
- dev サーバーを止めるときはポート指定で。`taskkill /IM node.exe` は使わない

## 残タスク

- 銘柄データの価格49件が null。**後述の落とし穴「価格は改定が続いている」を読んでから着手すること**
- 喫煙可能店の種別は店名からの推測。業態が読めない店は restaurant に寄っている
  （`scripts/import-osaka-shops.mjs` の `TYPE_RULES` で調整可能）
- お気に入りスポットと設定はマイページに項目だけあり「準備中」と出している。
  お気に入りは `favorites` テーブルと RLS から要る。Osaka Metro の喫煙所データも未着手
- マップの spots 取得は全件読み（limit 2000）。他都市を足すなら表示範囲で絞ること
- 検証用に作った匿名ユーザーが `auth.users` に残っている
- **GA / Speed Insights はコードは入ったが計測は始まっていない。** ダッシュボード側の
  作業が3つ残っている：GA4 プロパティを作って測定 ID を取る、Vercel の環境変数に
  `NEXT_PUBLIC_GA_ID` を設定する、Vercel で Speed Insights を有効化する
- `/about/privacy` に事業者名と問い合わせ先の記載が無いまま公開している。氏名・メールを
  取得していないので開示請求の窓口は要らないという判断。会社アドレスは勤務先に紐づくため
  載せない。**問い合わせフォームを作ったら、その URL を追記する**
- マイページの「利用規約」「設定」「お気に入りスポット」はメニュー項目だけでリンク先が無い
