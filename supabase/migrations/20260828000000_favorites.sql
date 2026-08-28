-- お気に入りスポット。checkins と似た形だが、性質が2つ違う。
--
-- 1. トグルである。押すたびに行が増えるチェックインと違い、ある/ない の2状態しか無い。
--    二重タップや2タブで同じ組が2行入ると、解除しても片方が残って「消えない」ように見える。
--    そのため unique (user_id, spot_id) をアプリ側の判定に頼らず DB で保証する
-- 2. 本人しか読まない。行きたい場所のリストであって集計には使わないので、
--    checkins のような select using (true) にはしない。anon key で
--    「どの匿名ユーザーがどの喫煙所を保存したか」を全件引ける状態を作らないため
--
-- spot_id / user_id は not null。RLS が auth.uid() = user_id を要求するので
-- user_id が null の行は誰にも読めず、作る意味が無い。

create table if not exists public.favorites (
  id uuid default gen_random_uuid() primary key,
  spot_id uuid not null references public.spots(id) on delete cascade,
  user_id uuid not null,
  created_at timestamptz default now(),
  unique (user_id, spot_id)
);

-- 一覧は「自分の分を保存した新しい順」でしか引かないので、その形の複合インデックス
create index if not exists favorites_user_created_idx
  on public.favorites (user_id, created_at desc);

alter table public.favorites enable row level security;

drop policy if exists "favorites readable by owner"   on public.favorites;
drop policy if exists "favorites insertable by owner" on public.favorites;
drop policy if exists "favorites deletable by owner"  on public.favorites;

-- 閲覧・追加・削除すべて本人のみ。update は無い（トグルなので insert と delete で足りる）
create policy "favorites readable by owner"
  on public.favorites for select to authenticated using (auth.uid() = user_id);

create policy "favorites insertable by owner"
  on public.favorites for insert to authenticated with check (auth.uid() = user_id);

create policy "favorites deletable by owner"
  on public.favorites for delete to authenticated using (auth.uid() = user_id);
