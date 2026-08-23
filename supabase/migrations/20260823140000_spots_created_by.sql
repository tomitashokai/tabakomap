-- 「投稿したスポット」を出すために投稿者を記録する。
-- 既存のインポート済みスポット（大阪市オープンデータ 444 件）は created_by が null のまま＝運営投入扱い。

alter table public.spots
  add column if not exists created_by uuid references auth.users(id) on delete set null;

create index if not exists spots_created_by_idx on public.spots (created_by);

-- 他人になりすまして投稿できないよう、insert 時に created_by = 自分 を強制する
drop policy if exists "spots insertable by authed" on public.spots;
create policy "spots insertable by authed" on public.spots
  for insert to authenticated
  with check (auth.uid() = created_by);

-- 自分が投稿したスポットは取り下げられる
drop policy if exists "spots deletable by owner" on public.spots;
create policy "spots deletable by owner" on public.spots
  for delete to authenticated
  using (auth.uid() = created_by);
