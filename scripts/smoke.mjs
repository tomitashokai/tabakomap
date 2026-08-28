/**
 * 実 Chrome で主要な操作を通しで踏んで、壊れていないかを機械的に確かめる。
 *
 * 前提: 別ターミナルで `npx next start -p 3100`（または dev）が動いていること。
 *   node scripts/smoke.mjs
 *   SMOKE_BASE_URL=http://localhost:3000 node scripts/smoke.mjs
 *
 * ここで見ているのは「一度壊れていた」ものばかり。検索欄が飾りだった、登録に
 * 現在地が入らなかった、詳細シートが誤った警告を出していた、の3つを踏み直す。
 * お気に入りは新機能だが、★・一覧・解除が3ファイルに分かれていて手で追うと漏れるので入れた。
 *
 * **お気に入りの項目だけは DB に書き込む。** 付けて一覧で確認して解除するので、
 * 通り抜ければ行は残らない。途中で落ちたときは匿名ユーザーの favorites が1行残る
 * （本人しか読めないので他のユーザーには影響しない）。本番に当てるときはこれを承知で。
 *
 * スポット名で DOM を引くので、元データから該当スポットが消えると NG になる。
 * その場合は名前を差し替えること（データが変わっただけで、機能の退行ではない）。
 *
 * **ローカル(Windows) 専用**：クラウドでは実 Chrome が無いので動かない。
 */
import puppeteer from 'puppeteer';

const BASE = process.env.SMOKE_BASE_URL ?? 'http://localhost:3100';

/** 誰でも入れる場所（地図に既定で出る）。地下街利用者のみ */
const OPEN_SPOT = 'ドーチカ喫煙室';
/** 入場制限つき（既定では地図に出ないのでトグルが必要）。店舗利用者のみ */
const RESTRICTED_SPOT = '珈琲店 ボア';
/** 検索語。該当が全部「店舗利用者のみ」なので、検索が絞り込みを跨ぐかを見られる */
const QUERY = 'トヨタ';

const browser = await puppeteer.launch({
  channel: 'chrome',
  headless: true,
  args: [
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--hide-scrollbars',
  ],
});
const ctx = browser.defaultBrowserContext();
await ctx.overridePermissions(BASE, ['geolocation']);

const page = await browser.newPage();
await page.setViewport({ width: 390, height: 1000, deviceScaleFactor: 2 });
await page.setGeolocation({ latitude: 34.694, longitude: 135.502 });

const consoleErrors = [];
page.on('console', (m) => {
  if (m.type() === 'error') consoleErrors.push(m.text());
});
page.on('pageerror', (e) => consoleErrors.push(String(e)));

const results = [];
const check = (label, ok) => results.push([label, !!ok]);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const text = () => page.evaluate(() => document.body.innerText);

/** 地図はタイルとマーカーが出そろうまで待つ */
async function openMap() {
  await page.goto(`${BASE}/map`, { waitUntil: 'networkidle2', timeout: 60000 });
  await wait(5000);
}

const clickButton = (label) =>
  page.evaluate(
    (l) => !![...document.querySelectorAll('button')].find((b) => b.textContent?.includes(l))?.click(),
    label
  );

/** aria-label 完全一致で押す。disabled のまま押して「押した」と誤認しないよう見ておく */
const clickByLabel = (label) =>
  page.evaluate((l) => {
    const el = document.querySelector(`[aria-label="${l}"]`);
    if (!el || el.disabled) return false;
    el.click();
    return true;
  }, label);

const clickMarker = (name) =>
  page.evaluate((n) => {
    const el = document.querySelector(`[title="${n}"]`);
    if (!el) return false;
    el.click();
    return true;
  }, name);

// --- 検索 ---------------------------------------------------------------
await openMap();
const beforeSearch = (await text()).match(/近くのスポット \((\d+)件\)/)?.[1];
check('既定で件数が出ている', Number(beforeSearch) > 0);

await page.click('input');
await page.type('input', QUERY, { delay: 40 });
await wait(2500);
let t = await text();
const hits = t.match(/「.+」の検索結果 \((\d+)件\)/)?.[1];
check('検索が件数を出す', Number(hits) > 0);
check('検索は絞り込みを跨いで条件つきも出す', t.includes('店舗利用者のみ'));

await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => b.textContent === '×')?.click());
await wait(1500);
t = await text();
check('× で検索前の状態に戻る', t.includes(`近くのスポット (${beforeSearch}件)`));

// --- 詳細シートの利用条件 ------------------------------------------------
await clickMarker(OPEN_SPOT);
await wait(2000);
t = await text();
check(`${OPEN_SPOT} に入場制限の誤警告が出ない`, !t.includes('誰でも自由に立ち寄れる場所ではない'));
check(`${OPEN_SPOT} に条件の補足が出る`, t.includes('通りがかれば誰でも該当します'));

await openMap();
await clickButton('店舗利用者のみも表示');
await wait(2500);
const found = await clickMarker(RESTRICTED_SPOT);
await wait(2500);
t = await text();
check(`${RESTRICTED_SPOT} のピンがある`, found);
check(`${RESTRICTED_SPOT} に入場制限の警告が出る`, t.includes('誰でも自由に立ち寄れる場所ではない'));

// --- お気に入り（付ける → 一覧に出る → 解除する） -------------------------
// ここだけ DB に書き込む。最後に解除して元に戻す
await openMap();
await clickMarker(OPEN_SPOT);
await wait(2000);
// ★ は現在の状態を DB に問い合わせるまで disabled なので、押せること自体を見る
check('★ が押せる状態になる', await clickByLabel('お気に入りに追加'));
await wait(2000);
check(
  '★ を押すと保存済みの表示に変わる',
  await page.evaluate(() => !!document.querySelector('[aria-label="お気に入りから外す"]'))
);

await page.goto(`${BASE}/mypage/favorites`, { waitUntil: 'networkidle2', timeout: 60000 });
await wait(3000);
t = await text();
check('お気に入り一覧に保存したスポットが出る', t.includes(OPEN_SPOT));
check('一覧に「準備中」が残っていない', !t.includes('準備中'));

check('一覧から解除できる', await clickByLabel(`${OPEN_SPOT}をお気に入りから外す`));
await wait(2000);
t = await text();
check('解除すると一覧から消える', !t.includes(OPEN_SPOT));

// --- 登録モーダルが自分で現在地を取る ------------------------------------
await openMap();
await clickButton('＋ 登録');
await wait(3000);
t = await text();
check('📍 を押さずに現在地が入る', /現在地に登録します/.test(t));
check(
  '登録ボタンが押せる',
  await page.evaluate(
    () =>
      ![...document.querySelectorAll('button')].find((b) => b.textContent?.includes('この場所を登録する'))
        ?.disabled
  )
);

// --- 銘柄検索 -----------------------------------------------------------
await page.goto(`${BASE}/brands`, { waitUntil: 'networkidle2', timeout: 60000 });
await wait(3000);
await page.click('input');
await page.type('input', 'メビウス', { delay: 40 });
await wait(1500);
t = await text();
check('銘柄検索が効く', t.includes('メビウス') && !t.includes('一致する銘柄はありません'));

await browser.close();

// --- 結果 ---------------------------------------------------------------
let ng = 0;
for (const [label, ok] of results) {
  console.log(`${ok ? '  OK  ' : '  NG  '} ${label}`);
  if (!ok) ng++;
}

/*
 * Speed Insights のスクリプトは Vercel 上にしか無いので、ローカルでは必ず 404 になる。
 * これを NG に数えると毎回赤くなって意味を失う
 */
const unexpected = consoleErrors.filter((e) => !/speed-insights/.test(e) && !/404/.test(e));
console.log(`\n想定外のコンソールエラー: ${unexpected.length}件`);
unexpected.slice(0, 5).forEach((e) => console.log('  - ' + e.slice(0, 200)));

console.log(ng === 0 && unexpected.length === 0 ? '\n=> すべて通過' : `\n=> ${ng}件 失敗`);
process.exit(ng === 0 && unexpected.length === 0 ? 0 : 1);
