/**
 * 実 Chrome で外部ページを開いてテキストを吐く。価格の裏取り用。
 *
 * メーカー各社の公式は自動取得を弾く。**curl も WebFetch も通らないが実 Chrome なら読める。**
 *   - JT（jti.co.jp）: UA を変えても 403
 *   - glo（myglo.com）/ IQOS: 年齢認証でリダイレクトされる
 * そのたびに使い捨てのスクリプトを書いていたので、ここに置く。
 *
 * 使い方:
 *   node scripts/fetch-page-text.mjs https://www.jti.co.jp/tobacco/products/mevius/index.html
 *   node scripts/fetch-page-text.mjs <url> --grep 円          # 一致行だけ出す
 *   node scripts/fetch-page-text.mjs <url> --out out/page.txt
 *   node scripts/fetch-page-text.mjs <url> --no-gate          # 年齢認証を触らない
 *
 * 年齢認証は「はい」「同意」「20歳以上」等のボタンを総当たりで押す（--gate で文字列を追加）。
 * 押せるものが無ければ何もせず素通りするので、認証の無いページにもそのまま使える。
 *
 * バンドル Chromium は .puppeteerrc.cjs で落とさない設定なので、端末の Chrome を使う。
 * **これはローカル(Windows) 専用。** クラウドには実 Chrome が無い。
 */
import puppeteer from 'puppeteer';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const [, , url, ...rest] = process.argv;

if (!url || !/^https?:\/\//.test(url)) {
  console.error('使い方: node scripts/fetch-page-text.mjs <url> [--grep 円] [--out file] [--no-gate]');
  process.exit(1);
}

function strFlag(name, fallback = null) {
  const i = rest.indexOf(`--${name}`);
  return i === -1 ? fallback : rest[i + 1];
}

const grep = strFlag('grep');
const outArg = strFlag('out');
const settle = Number(strFlag('settle', '3000'));

/** 年齢認証の同意ボタンにありがちな文字。--gate で足せる */
const GATE_LABELS = [
  strFlag('gate'),
  'はい',
  '同意する',
  '同意します',
  '20歳以上',
  '２０歳以上',
  'YES',
  'Yes',
  'I am',
  '進む',
  'サイトに入る',
].filter(Boolean);

const browser = await puppeteer.launch({
  channel: 'chrome',
  headless: true,
  args: ['--hide-scrollbars', '--lang=ja-JP'],
});

const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 1600 });
// 言語を明示しないと英語版に振られるサイトがある
await page.setExtraHTTPHeaders({ 'Accept-Language': 'ja-JP,ja;q=0.9' });

console.log(`開く: ${url}`);
await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

/**
 * 年齢認証を通す。ボタンは button / a / label と実装がまちまちなので、
 * セレクタではなく**表示文字**で探して押す。押した後の遷移も待つ
 */
if (!rest.includes('--no-gate')) {
  for (const label of GATE_LABELS) {
    const clicked = await page.evaluate((text) => {
      const els = [...document.querySelectorAll('button, a, input[type=button], input[type=submit], label, div[role=button]')];
      const hit = els.find((el) => (el.innerText || el.value || '').trim().startsWith(text));
      if (!hit) return false;
      hit.click();
      return true;
    }, label);
    if (clicked) {
      console.log(`年齢認証を押した: ${label}`);
      await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {});
      break;
    }
  }
}

await new Promise((r) => setTimeout(r, settle));

console.log(`最終URL: ${page.url()}`);

const text = await page.evaluate(() => document.body.innerText);
await browser.close();

// 空行を潰す。公式の価格表は空行だらけで、そのままだと行数が読めない
const lines = text
  .split('\n')
  .map((l) => l.trim())
  .filter(Boolean);

const shown = grep ? lines.filter((l) => l.includes(grep)) : lines;

if (outArg) {
  const out = resolve(outArg);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, lines.join('\n'), 'utf8');
  console.log(`保存: ${out}（${lines.length} 行）`);
}

console.log(`--- ${shown.length} 行 ---`);
console.log(shown.join('\n'));
