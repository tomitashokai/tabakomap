/**
 * 実 Chrome でページを開いてスクリーンショットを撮る。目視検証用。
 *
 * 前提: 別ターミナルで `npx next dev` が動いていること。
 *
 * 使い方:
 *   node scripts/screenshot.mjs /map out/map.png
 *   node scripts/screenshot.mjs /brands out/brands.png --width 390 --height 844
 *   node scripts/screenshot.mjs /map out/r.png --click 飲食店 --center 34.6717,135.5013
 *
 * Git Bash から叩くときは MSYS_NO_PATHCONV=1 を付けること。付けないと `/map` が
 * `C:/Program Files/Git/map` に化けて "Cannot navigate to invalid URL" になる。
 *
 * バンドル Chromium は .puppeteerrc.cjs で落とさない設定にしてあるので、
 * 端末にインストール済みの Chrome を channel: 'chrome' で使う。
 */
import puppeteer from 'puppeteer';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const [, , pathArg = '/map', outArg = 'out/screenshot.png', ...rest] = process.argv;

function flag(name, fallback) {
  const i = rest.indexOf(`--${name}`);
  return i === -1 ? fallback : Number(rest[i + 1]);
}

function strFlag(name, fallback = null) {
  const i = rest.indexOf(`--${name}`);
  return i === -1 ? fallback : rest[i + 1];
}

const BASE = process.env.SCREENSHOT_BASE_URL ?? 'http://localhost:3000';
const width = flag('width', 390);   // iPhone 相当
const height = flag('height', 844);
const settle = flag('settle', 6000); // 地図タイルが出そろうまでの待ち
const out = resolve(outArg);

mkdirSync(dirname(out), { recursive: true });

const browser = await puppeteer.launch({
  channel: 'chrome',
  headless: true,
  args: [
    // Mapbox GL は WebGL を要る。ヘッドレスで GPU が無くても描けるようにする
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--hide-scrollbars',
  ],
});

const page = await browser.newPage();
await page.setViewport({ width, height, deviceScaleFactor: 2 });

// 位置情報は許可しておく（現在地ボタンや初期表示のため）
const [clat, clng] = (strFlag('center') ?? '34.694,135.502').split(',').map(Number);
const ctx = browser.defaultBrowserContext();
await ctx.overridePermissions(BASE, ['geolocation']);
await page.setGeolocation({ latitude: clat, longitude: clng });

const consoleErrors = [];
page.on('console', (m) => {
  if (m.type() === 'error') consoleErrors.push(m.text());
});
page.on('pageerror', (e) => consoleErrors.push(String(e)));

const url = `${BASE}${pathArg}`;
console.log(`開く: ${url}`);
await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

// --click は複数指定できる。フィルターチップ → カード → …と順に押していける
const clickTargets = rest.reduce((acc, v, i) => (v === '--click' ? [...acc, rest[i + 1]] : acc), []);
for (const t of clickTargets) {
  await new Promise((r) => setTimeout(r, 3000));
  const hit = await page.evaluate((text) => {
    // ボタンを優先し、無ければクリック可能な要素（カードなど）から最も内側のものを選ぶ
    const btn = [...document.querySelectorAll('button')].find((b) => b.textContent?.includes(text));
    if (btn) { btn.click(); return btn.textContent; }
    const clickable = [...document.querySelectorAll('[style*="cursor: pointer"], a')]
      .filter((e) => e.textContent?.includes(text))
      .sort((a, b) => a.textContent.length - b.textContent.length)[0];
    if (clickable) { clickable.click(); return clickable.textContent; }
    return null;
  }, t);
  console.log(hit ? `クリック: ${hit.trim().slice(0, 40)}` : `「${t}」に一致する要素が見つかりません`);
}

// 地図ページならキャンバスが出るまで待つ
const canvas = await page.$('.mapboxgl-canvas');
if (canvas) {
  console.log('mapbox canvas を検出。タイルの読み込みを待つ…');
  await new Promise((r) => setTimeout(r, settle));
} else {
  await new Promise((r) => setTimeout(r, 1500));
}

await page.screenshot({ path: out });
console.log(`保存: ${out}`);

if (consoleErrors.length) {
  console.log(`\nコンソールエラー ${consoleErrors.length} 件:`);
  consoleErrors.slice(0, 10).forEach((e) => console.log('  - ' + e.slice(0, 300)));
}

await browser.close();
