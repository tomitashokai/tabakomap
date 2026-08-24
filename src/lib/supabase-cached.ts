import { createClient } from '@supabase/supabase-js';

/**
 * SEO 用の公開ページ（/areas, /areas/[ward], /spots/[id], sitemap.xml）専用の
 * 読み取りクライアント。
 *
 * 共有の `./supabase` を使い回してはいけない。あちらは匿名サインインのセッションを
 * 持ってブラウザ側からも呼ばれるので、キャッシュすると他人の認証結果を配る恐れがある。
 * こちらはセッションを持たない匿名読み取り専用にして、Next の fetch キャッシュに載せる。
 *
 * fetch はデフォルト no-store で、そのままだとルートが dynamic 判定になり
 * `export const revalidate` が効かない。ここで明示的に revalidate を渡すことで、
 * スポット542件のページがクロールされても DB を叩くのは1時間に1回で済む。
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/** 公開ページのキャッシュ保持時間（秒）。ルート側の `revalidate` と揃えること */
export const PUBLIC_CACHE_SECONDS = 3600;

export const supabasePublic = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
  global: {
    fetch: (input, init) =>
      fetch(input, { ...init, next: { revalidate: PUBLIC_CACHE_SECONDS } }),
  },
});
