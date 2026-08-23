-- 喫煙可能な飲食店（お好み焼き・焼肉・居酒屋など）を入れるための種別を追加する。
-- これが無いと焼肉屋を「喫煙可バー」として出すことになる。

alter table public.spots drop constraint if exists spots_type_check;

alter table public.spots add constraint spots_type_check
  check (type in ('smoking', 'shop', 'shisha', 'cigar', 'cafe', 'bar', 'restaurant'));
