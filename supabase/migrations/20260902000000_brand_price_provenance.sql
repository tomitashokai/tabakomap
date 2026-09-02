-- 銘柄の価格に「いつ・どこで確認したか」を持たせる。
--
-- price だけを裸で持っていたため、2026年に入ってからの加熱式の相次ぐ改定
-- （1月 glo / 4月 JT・PMJ / 6月 BAT / 10月 全社）に追随できず、
-- プルーム用メビウスが 520円（実際は 550円）のまま配られていた。
-- さらに銘柄名自体が公式カタログに無いものが混ざっており、
-- 「公式の定価」と「参考値」を区別できないことが根本の問題だった。
--
-- price_source が null の行は参考価格であり、定価として表示してはいけない。

alter table public.brands
  add column if not exists price_as_of  date,
  add column if not exists price_source text;

comment on column public.brands.price_as_of is
  '小売定価を公式の情報で確認した日。null は未確認（price は参考値）';

comment on column public.brands.price_source is
  '価格の出典（JT公式 / PMJ公式 など）。null は参考価格を意味し、定価として表示しないこと';
