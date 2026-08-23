-- 「店舗利用者のみ」「加熱式専用」といった利用条件を独立したカラムにする。
--
-- これが無いと、自動車ディーラーの店舗利用者向け喫煙室が、誰でも入れる公共喫煙所と
-- 同じ 🚬 ピンで並んでしまい、行っても吸えない場所に案内することになる。
-- 取り込み時は hours に併記して逃がしていたが、表示・絞り込みに使えないので分離する。

alter table public.spots
  add column if not exists usage_condition text;

comment on column public.spots.usage_condition is
  '利用条件の原文（例: 店舗利用者のみ / 地下街利用者のみ / 加熱式専用 / 特になし）。null は不明';
