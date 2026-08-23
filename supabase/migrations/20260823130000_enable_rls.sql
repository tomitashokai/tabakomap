-- RLS を有効化し、匿名サインイン（authenticated ロール）を前提としたポリシーを張る。
-- これが無いと anon key だけで誰でも spots / checkins / brands を書き換えられる。

alter table public.spots    enable row level security;
alter table public.checkins enable row level security;
alter table public.brands   enable row level security;

drop policy if exists "spots readable by all"        on public.spots;
drop policy if exists "spots insertable by authed"   on public.spots;
drop policy if exists "brands readable by all"       on public.brands;
drop policy if exists "checkins readable by all"     on public.checkins;
drop policy if exists "checkins insertable by owner" on public.checkins;
drop policy if exists "checkins deletable by owner"  on public.checkins;

-- spots: 誰でも閲覧、ログイン済み（匿名含む）のみ追加。更新・削除は不可
create policy "spots readable by all"      on public.spots   for select using (true);
create policy "spots insertable by authed" on public.spots   for insert to authenticated with check (true);

-- brands: 読み取り専用。投入は Management API / service_role で行う
create policy "brands readable by all"     on public.brands  for select using (true);

-- checkins: 集計のため誰でも閲覧、追加・削除は本人のみ
create policy "checkins readable by all"     on public.checkins for select using (true);
create policy "checkins insertable by owner" on public.checkins for insert to authenticated with check (auth.uid() = user_id);
create policy "checkins deletable by owner"  on public.checkins for delete to authenticated using (auth.uid() = user_id);
