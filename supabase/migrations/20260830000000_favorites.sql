-- お気に入りスポット。チェックイン（誰でも件数を見られる）と違い、
-- 誰が何をお気に入りにしたかは本人以外に見せる必要が無いので select も本人のみに絞る。

create table if not exists public.favorites (
  id         uuid default gen_random_uuid() primary key,
  spot_id    uuid not null references public.spots(id) on delete cascade,
  user_id    uuid not null,
  created_at timestamptz default now(),
  -- 同じスポットを二重に登録させない。解除は行削除で行う
  unique (user_id, spot_id)
);

-- マイページは user_id で全件引くので、その並び替えまで含めて張っておく
create index if not exists favorites_user_created
  on public.favorites (user_id, created_at desc);

alter table public.favorites enable row level security;

drop policy if exists "favorites readable by owner"  on public.favorites;
drop policy if exists "favorites insertable by owner" on public.favorites;
drop policy if exists "favorites deletable by owner"  on public.favorites;

create policy "favorites readable by owner"   on public.favorites for select to authenticated using (auth.uid() = user_id);
create policy "favorites insertable by owner" on public.favorites for insert to authenticated with check (auth.uid() = user_id);
create policy "favorites deletable by owner"  on public.favorites for delete to authenticated using (auth.uid() = user_id);
