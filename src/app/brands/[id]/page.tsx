import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import BottomNav from '@/components/BottomNav';
import { fetchBrandById, fetchRelatedBrands } from '@/lib/brands';
import {
  AVAILABILITY_LABELS,
  BRAND_CATEGORY_EMOJIS,
  BRAND_CATEGORY_LABELS,
  formatPriceProvenance,
  isVerifiedPrice,
  type Brand,
} from '@/lib/types';

// 1時間ごとに再生成する。データ取得側（supabase-cached.ts）の revalidate と揃えること
export const revalidate = 3600;

interface Props {
  params: Promise<{ id: string }>;
}

/** カテゴリのラベル。null は「たばこ製品」に寄せる（種別不明を画面に出さない） */
function categoryLabel(brand: Brand): string {
  return brand.category ? BRAND_CATEGORY_LABELS[brand.category] : 'たばこ製品';
}

/** 価格の表記。裏が取れていない値には必ず「参考」を付ける */
function priceText(brand: Brand): string | null {
  if (brand.price == null) return null;
  return isVerifiedPrice(brand) ? `${brand.price}円` : `${brand.price}円（参考）`;
}

/**
 * 数値の有無で説明文の情報量が大きく変わるので、あるものだけを繋ぐ。
 * 「タール —mg」のような空表記を description に混ぜない
 */
function buildDescription(brand: Brand): string {
  const facts = [
    brand.maker ? `メーカー: ${brand.maker}` : null,
    brand.tar != null ? `タール ${brand.tar}mg` : null,
    brand.nicotine != null ? `ニコチン ${brand.nicotine}mg` : null,
    brand.price != null ? `価格 ${priceText(brand)}` : null,
    brand.availability ? AVAILABILITY_LABELS[brand.availability] : null,
  ].filter(Boolean);

  const head = `${brand.name}（${categoryLabel(brand)}）の情報。`;
  return facts.length ? `${head}${facts.join(' / ')}。` : `${head}タバコマップの銘柄データベースに掲載しています。`;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const brand = await fetchBrandById(id);
  if (!brand) return { title: '銘柄が見つかりません' };

  const title = `${brand.name}｜${categoryLabel(brand)}`;

  return {
    title,
    description: buildDescription(brand),
    alternates: { canonical: `/brands/${id}` },
    openGraph: { title, description: buildDescription(brand) },
  };
}

export default async function BrandPage({ params }: Props) {
  const { id } = await params;
  const brand = await fetchBrandById(id);
  if (!brand) notFound();

  const related = await fetchRelatedBrands(brand);
  const emoji = brand.category ? BRAND_CATEGORY_EMOJIS[brand.category] : '🚬';

  const provenance = formatPriceProvenance(brand);

  /**
   * offers は**公式で裏の取れた定価のときだけ**付ける。
   *
   * 価格が無い銘柄が49件あるので価格の有無を見るのは元からだが、シードの価格は
   * 生成された概算なので、それを offers に載せると検索結果に概算が「販売価格」として
   * 出てしまう。参考価格は本文に「参考」と添えて出すだけにする
   */
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: brand.name,
    category: categoryLabel(brand),
    ...(brand.maker ? { brand: { '@type': 'Brand', name: brand.maker } } : {}),
    ...(isVerifiedPrice(brand)
      ? {
          offers: {
            '@type': 'Offer',
            price: brand.price,
            priceCurrency: 'JPY',
            availability: 'https://schema.org/InStock',
          },
        }
      : {}),
  };

  return (
    <div style={{ minHeight: '100dvh', background: '#f5f5f5', paddingBottom: 88 }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div
        style={{
          background: 'linear-gradient(135deg, #2d2d2d, #1a1a1a)',
          padding: '28px 20px 24px',
          color: 'white',
        }}
      >
        <nav style={{ fontSize: 12, opacity: 0.7, marginBottom: 10 }}>
          <Link href="/brands" style={{ color: 'white' }}>
            銘柄データベース
          </Link>
          {' / '}
          <span>{categoryLabel(brand)}</span>
        </nav>
        <div style={{ fontSize: 40, marginBottom: 8 }}>{emoji}</div>
        <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>{brand.name}</h1>
        <p style={{ fontSize: 13, opacity: 0.8, marginTop: 6 }}>
          {categoryLabel(brand)}
          {brand.maker ? ` ・ ${brand.maker}` : ''}
        </p>
      </div>

      <div style={{ padding: 16 }}>
        <dl style={{ background: 'white', borderRadius: 16, padding: '4px 16px', margin: 0 }}>
          <Row label="メーカー" value={brand.maker ?? '不明'} />
          <Row label="種別" value={categoryLabel(brand)} />
          <Row label="タール" value={brand.tar != null ? `${brand.tar}mg` : '表記なし'} />
          <Row label="ニコチン" value={brand.nicotine != null ? `${brand.nicotine}mg` : '表記なし'} />
          <Row label="価格" value={priceText(brand) ?? '不明'} sub={provenance ?? undefined} />
          <Row
            label="流通"
            value={brand.availability ? AVAILABILITY_LABELS[brand.availability] : '不明'}
            last
          />
        </dl>

        {brand.category === 'heated' && (
          <p style={note}>
            加熱式たばこはたばこ葉を燃やさないため、紙巻きたばこのようなタール・ニコチンの
            表記がありません。
          </p>
        )}
        {brand.price == null && (
          <p style={note}>
            価格は裏付けが取れなかったため掲載していません。定価は改定されることがあるため、
            メーカーの公式サイトでご確認ください。
          </p>
        )}
        {/*
          出典なしの価格は概算で、公式カタログに無い銘柄も混ざっている。
          「値段が違う」ではなく「この銘柄自体が現行品でないかもしれない」ので、
          金額の注意書きだけで済ませない
        */}
        {brand.price != null && !isVerifiedPrice(brand) && (
          <p style={note}>
            この価格は公式の定価を確認できていない参考値です。銘柄名や規格が現行品と
            異なる場合もあります。正確な定価は
            {brand.maker ? `${brand.maker}の` : 'メーカーの'}公式サイトでご確認ください。
          </p>
        )}
        {isVerifiedPrice(brand) && (
          <p style={note}>
            価格は{provenance}の小売定価です。2026年は改定が続いており、加熱式は
            2026年10月1日にも改定が予定されています。
          </p>
        )}

        {related.length > 0 && (
          <>
            <h2 style={{ fontSize: 15, fontWeight: 700, margin: '24px 0 10px' }}>
              同じ{categoryLabel(brand)}の銘柄
            </h2>
            <div>
              {related.map((r) => (
                <Link
                  key={r.id}
                  href={`/brands/${r.id}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    background: 'white',
                    borderRadius: 14,
                    padding: '12px 14px',
                    marginBottom: 8,
                    textDecoration: 'none',
                    color: 'inherit',
                  }}
                >
                  <span style={{ fontSize: 22 }}>
                    {r.category ? BRAND_CATEGORY_EMOJIS[r.category] : '🚬'}
                  </span>
                  <span style={{ flex: 1, fontSize: 14, fontWeight: 600 }}>{r.name}</span>
                  {r.price != null && (
                    <span style={{ fontSize: 13, fontWeight: 700 }}>
                      ¥{r.price}
                      {!isVerifiedPrice(r) && (
                        <span style={{ fontSize: 10, color: '#aaa', marginLeft: 3 }}>参考</span>
                      )}
                    </span>
                  )}
                  <span style={{ color: '#ccc' }}>›</span>
                </Link>
              ))}
            </div>
          </>
        )}

        <p style={{ fontSize: 13, color: '#888', marginTop: 20, textAlign: 'center' }}>
          <Link href="/brands" style={{ color: '#f59e0b', fontWeight: 600 }}>
            銘柄データベースをすべて見る →
          </Link>
        </p>

        <p style={{ fontSize: 11, color: '#999', lineHeight: 1.8, marginTop: 20 }}>
          掲載値は各メーカーの公開情報をもとにした参考値です。出典は
          <Link href="/about/data" style={{ color: '#b45309', textDecoration: 'none' }}>
            データの出典
          </Link>
          に記載しています。
        </p>
      </div>

      <BottomNav />
    </div>
  );
}

/** `sub` は値の下に小さく添える補足（価格の出典と確認日）。無ければ行の見た目は変わらない */
function Row({
  label,
  value,
  sub,
  last,
}: {
  label: string;
  value: string;
  sub?: string;
  last?: boolean;
}) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        gap: 12,
        padding: '14px 0',
        borderBottom: last ? 'none' : '1px solid #f5f5f5',
      }}
    >
      <dt style={{ fontSize: 13, color: '#888', flexShrink: 0 }}>{label}</dt>
      <dd style={{ margin: 0, textAlign: 'right' }}>
        <span style={{ fontSize: 14, fontWeight: 600 }}>{value}</span>
        {sub && (
          <span style={{ display: 'block', fontSize: 11, color: '#999', marginTop: 3 }}>{sub}</span>
        )}
      </dd>
    </div>
  );
}

const note: React.CSSProperties = {
  fontSize: 12,
  color: '#666',
  lineHeight: 1.8,
  background: '#fafafa',
  border: '1px solid #f0f0f0',
  borderRadius: 12,
  padding: '10px 14px',
  marginTop: 12,
};
