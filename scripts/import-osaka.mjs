import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const SUPABASE_URL = 'https://mtfpxjbibezuduzhoepr.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'sb_publishable_bYkFi8KYBPqH-FkhmxrucQ_itqkgoGF';
const CSV_FILE = join(dirname(fileURLToPath(import.meta.url)), 'osaka-smoking-utf8.csv');

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function readCsv() {
  return readFileSync(CSV_FILE, 'utf-8');
}

function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter(Boolean);
  const headers = parseLine(lines[0]);
  return lines.slice(1).map(line => {
    const values = parseLine(line);
    const row = {};
    headers.forEach((h, i) => { row[h.trim()] = (values[i] ?? '').trim(); });
    return row;
  });
}

function parseLine(line) {
  const result = [];
  let cur = '';
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQuote && line[i + 1] === '"') { cur += '"'; i++; }
      else inQuote = !inQuote;
    } else if (c === ',' && !inQuote) {
      result.push(cur); cur = '';
    } else {
      cur += c;
    }
  }
  result.push(cur);
  return result;
}

function parseDetail(detail) {
  const hours = detail.match(/供用時間：([^，,]+)/)?.[1]?.trim() ?? null;
  const form = detail.match(/喫煙所形態：([^，,]+)/)?.[1]?.trim() ?? '';
  const is_outdoor = !form.includes('屋内');
  const is_24h = hours?.includes('24時間') ?? false;
  return { hours, is_outdoor, is_24h };
}

async function main() {
  console.log('CSVを読み込み中...');
  const text = readCsv();
  const rows = parseCsv(text);
  console.log(`${rows.length} 件取得`);

  const spots = rows
    .map(r => {
      const detail = r['詳細情報'] ?? '';
      const { hours, is_outdoor, is_24h } = parseDetail(detail);
      return {
        name: r['施設名称'] || r['名称'],
        address: r['所在地'] || r['住所'] || null,
        lat: parseFloat(r['緯度']),
        lng: parseFloat(r['経度']),
        type: 'smoking',
        is_outdoor,
        is_heated: false,
        is_24h,
        hours,
      };
    })
    .filter(s => s.name && !isNaN(s.lat) && !isNaN(s.lng));

  console.log(`有効データ: ${spots.length} 件`);

  // 100件ずつバッチインサート
  const BATCH = 100;
  let inserted = 0;
  for (let i = 0; i < spots.length; i += BATCH) {
    const batch = spots.slice(i, i + BATCH);
    const { error } = await supabase.from('spots').insert(batch);
    if (error) {
      console.error('\nError:', error.message);
    } else {
      inserted += batch.length;
    }
    process.stdout.write(`\r${inserted} / ${spots.length} 件インサート済み`);
  }
  console.log('\n完了！');
}

main().catch(console.error);
