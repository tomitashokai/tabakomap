// PWA アイコン生成スクリプト（依存なし / Node 標準の zlib のみ）
//
//   node scripts/gen-icons.mjs
//
// 出力:
//   public/icon-192.png      manifest.json 参照
//   public/icon-512.png      manifest.json 参照
//   src/app/apple-icon.png   Next.js の apple-icon ファイル規約 (180x180)
//   src/app/icon.png         Next.js の icon ファイル規約 (96x96)

import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// ---------------------------------------------------------------- PNG encoder

const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

/** rgba: Uint8Array(width * height * 4) -> PNG Buffer */
function encodePng(rgba, width, height) {
  const stride = width * 4;
  // 各スキャンラインの先頭にフィルタバイト 0 (None) を付ける
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    Buffer.from(rgba.buffer, rgba.byteOffset + y * stride, stride).copy(
      raw,
      y * (stride + 1) + 1
    );
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type: RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ------------------------------------------------------------------- drawing

const hex = (s) => [
  parseInt(s.slice(1, 3), 16),
  parseInt(s.slice(3, 5), 16),
  parseInt(s.slice(5, 7), 16),
];

const BG_TOP = hex('#2e2e2e');
const BG_BOTTOM = hex('#111111');
const PAPER = hex('#f4f1ea');
const PAPER_SHADE = hex('#d9d4c8');
const FILTER = hex('#f59e0b');
const FILTER_BAND = hex('#c2770a');
const EMBER = hex('#ff6b35');
const EMBER_CORE = hex('#ffd166');
const SMOKE = hex('#ffffff');

/** 角丸矩形の内外判定。u,v は矩形中心からの相対座標 */
function inRoundedRect(u, v, halfW, halfH, r) {
  const dx = Math.max(Math.abs(u) - (halfW - r), 0);
  const dy = Math.max(Math.abs(v) - (halfH - r), 0);
  return dx * dx + dy * dy <= r * r;
}

/**
 * 1 サンプル分の色を返す。座標は 0..1 に正規化済み。
 * detailed=false のときは小サイズ向けに要素を減らし、タバコを太くする。
 */
function sample(x, y, detailed) {
  // 背景（縦グラデーション）
  let [r, g, b] = [
    BG_TOP[0] + (BG_BOTTOM[0] - BG_TOP[0]) * y,
    BG_TOP[1] + (BG_BOTTOM[1] - BG_TOP[1]) * y,
    BG_TOP[2] + (BG_BOTTOM[2] - BG_TOP[2]) * y,
  ];

  const blend = (color, alpha) => {
    r += (color[0] - r) * alpha;
    g += (color[1] - g) * alpha;
    b += (color[2] - b) * alpha;
  };

  // 煙（右上の火先から立ちのぼる淡い円）。小サイズでは潰れるので描かない
  if (detailed) {
    const puffs = [
      { x: 0.755, y: 0.345, r: 0.045, a: 0.22 },
      { x: 0.7, y: 0.255, r: 0.038, a: 0.17 },
      { x: 0.72, y: 0.2, r: 0.03, a: 0.12 },
    ];
    for (const p of puffs) {
      const d = Math.hypot(x - p.x, y - p.y);
      if (d <= p.r) blend(SMOKE, p.a * (1 - d / p.r));
    }
  }

  // タバコ本体（中心まわりに -18 度回転した座標系で描く）
  const ANGLE = (-18 * Math.PI) / 180;
  const cos = Math.cos(ANGLE);
  const sin = Math.sin(ANGLE);
  const px = x - 0.5;
  const py = y - 0.5;
  const u = px * cos + py * sin;
  const v = -px * sin + py * cos;

  const halfW = detailed ? 0.28 : 0.315;
  const halfH = detailed ? 0.058 : 0.08;

  if (!inRoundedRect(u, v, halfW, halfH, halfH * 0.28)) {
    return [r, g, b];
  }

  // +u 方向が右上。火先を右上、フィルターを左下に置く
  const filterEnd = -halfW + (detailed ? 0.15 : 0.175);
  if (u <= filterEnd) {
    blend(FILTER, 1);
    // フィルターと巻紙の境界の帯
    if (u > filterEnd - halfW * 0.05) blend(FILTER_BAND, 1);
  } else {
    blend(PAPER, 1);
    const emberStart = halfW - halfW * (detailed ? 0.11 : 0.09);
    if (u >= emberStart) {
      // 火のついた先端
      blend(EMBER, 1);
      const coreStart = halfW - halfW * 0.045;
      if (u >= coreStart) blend(EMBER_CORE, 1);
    }
  }

  // 下側にわずかな陰影を入れて円筒らしく見せる
  const shade = Math.max(0, v / halfH);
  if (shade > 0) blend(PAPER_SHADE, shade * shade * 0.28);

  return [r, g, b];
}

/** size x size の RGBA を SS x SS スーパーサンプリングで描画 */
function render(size) {
  const detailed = size >= 128;
  const SS = 4;
  const out = new Uint8Array(size * size * 4);

  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let r = 0;
      let g = 0;
      let b = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const [sr, sg, sb] = sample(
            (px + (sx + 0.5) / SS) / size,
            (py + (sy + 0.5) / SS) / size,
            detailed
          );
          r += sr;
          g += sg;
          b += sb;
        }
      }
      const n = SS * SS;
      const i = (py * size + px) * 4;
      out[i] = Math.round(r / n);
      out[i + 1] = Math.round(g / n);
      out[i + 2] = Math.round(b / n);
      out[i + 3] = 255; // maskable のため全面不透明
    }
  }
  return out;
}

// ---------------------------------------------------------------------- main

const TARGETS = [
  ['public/icon-192.png', 192],
  ['public/icon-512.png', 512],
  ['src/app/apple-icon.png', 180],
  ['src/app/icon.png', 96],
];

for (const [relPath, size] of TARGETS) {
  const png = encodePng(render(size), size, size);
  const dest = join(ROOT, relPath);
  mkdirSync(dirname(dest), { recursive: true });
  writeFileSync(dest, png);
  console.log(`${relPath}  ${size}x${size}  ${(png.length / 1024).toFixed(1)} KB`);
}
