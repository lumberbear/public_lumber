create extension if not exists pgcrypto;

create table if not exists public.exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  tags text[] not null default '{}',
  sort_order integer not null default 1000,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);

create table if not exists public.exercise_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  exercise_id uuid not null,
  date date not null,
  resistance text not null default '',
  sets text not null default '',
  reps text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (exercise_id, user_id)
    references public.exercises(id, user_id)
    on delete cascade
);

alter table public.exercise_entries
  add column if not exists sets text not null default '';

alter table public.exercise_entries
  add column if not exists notes text not null default '';

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'exercise_entries'
      and column_name = 'modifier'
  ) then
    execute 'update public.exercise_entries set notes = modifier where coalesce(notes, '''') = '''' and modifier is not null';
    execute 'alter table public.exercise_entries drop column modifier';
  end if;
end $$;

create index if not exists exercises_user_sort_idx
  on public.exercises(user_id, sort_order);

create index if not exists exercise_entries_user_exercise_date_idx
  on public.exercise_entries(user_id, exercise_id, date desc);

alter table public.exercises enable row level security;
alter table public.exercise_entries enable row level security;

drop policy if exists "Users can select their exercises" on public.exercises;
create policy "Users can select their exercises"
  on public.exercises for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert their exercises" on public.exercises;
create policy "Users can insert their exercises"
  on public.exercises for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their exercises" on public.exercises;
create policy "Users can update their exercises"
  on public.exercises for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their exercises" on public.exercises;
create policy "Users can delete their exercises"
  on public.exercises for delete
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can select their exercise entries" on public.exercise_entries;
create policy "Users can select their exercise entries"
  on public.exercise_entries for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert their exercise entries" on public.exercise_entries;
create policy "Users can insert their exercise entries"
  on public.exercise_entries for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their exercise entries" on public.exercise_entries;
create policy "Users can update their exercise entries"
  on public.exercise_entries for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their exercise entries" on public.exercise_entries;
create policy "Users can delete their exercise entries"
  on public.exercise_entries for delete
  to authenticated
  using ((select auth.uid()) = user_id);
