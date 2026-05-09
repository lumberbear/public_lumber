create extension if not exists pgcrypto;

create table if not exists public.adventure_books (
  id uuid primary key default gen_random_uuid(),
  title text not null default 'Our Adventure Book',
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.adventure_book_members (
  book_id uuid not null references public.adventure_books(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'editor' check (role in ('owner', 'editor')),
  created_at timestamptz not null default now(),
  primary key (book_id, user_id)
);

create table if not exists public.adventure_book_invites (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.adventure_books(id) on delete cascade,
  code text not null unique,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '90 days'),
  revoked_at timestamptz
);

create table if not exists public.adventure_entries (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.adventure_books(id) on delete cascade,
  template text not null default 'scrapbook',
  title text not null default '',
  entry_date text not null default '',
  caption text not null default '',
  journal text not null default '',
  theme text not null default 'Golden Hour',
  custom_theme jsonb,
  profile_photo_id uuid,
  stickers jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, book_id)
);

create table if not exists public.adventure_photos (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.adventure_books(id) on delete cascade,
  storage_path text not null unique,
  entry_id uuid,
  align text not null default 'left',
  para integer not null default 0,
  comments jsonb not null default '[]'::jsonb,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  foreign key (entry_id, book_id)
    references public.adventure_entries(id, book_id)
    on delete cascade
);

create table if not exists public.adventure_settings (
  book_id uuid not null references public.adventure_books(id) on delete cascade,
  key text not null,
  value text,
  updated_at timestamptz not null default now(),
  primary key (book_id, key)
);

create index if not exists adventure_book_members_user_idx
  on public.adventure_book_members(user_id, book_id);

create index if not exists adventure_book_invites_book_idx
  on public.adventure_book_invites(book_id, created_at desc);

create index if not exists adventure_entries_book_date_idx
  on public.adventure_entries(book_id, entry_date desc, created_at desc);

create index if not exists adventure_photos_book_entry_idx
  on public.adventure_photos(book_id, entry_id, position);

create or replace function public.is_adventure_book_member(target_book_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.adventure_book_members member
    where member.book_id = target_book_id
      and member.user_id = auth.uid()
  );
$$;

create or replace function public.is_adventure_book_owner(target_book_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.adventure_book_members member
    where member.book_id = target_book_id
      and member.user_id = auth.uid()
      and member.role = 'owner'
  );
$$;

create or replace function public.is_adventure_book_storage_member(object_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = public, storage
as $$
declare
  first_folder text;
begin
  first_folder := (storage.foldername(object_name))[1];
  if first_folder is null
     or first_folder !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
    return false;
  end if;

  return public.is_adventure_book_member(first_folder::uuid);
end;
$$;

create or replace function public.create_adventure_book(book_title text default 'Our Adventure Book')
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_book_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  insert into public.adventure_books (title, created_by)
  values (coalesce(nullif(trim(book_title), ''), 'Our Adventure Book'), auth.uid())
  returning id into new_book_id;

  insert into public.adventure_book_members (book_id, user_id, role)
  values (new_book_id, auth.uid(), 'owner');

  return new_book_id;
end;
$$;

create or replace function public.create_adventure_book_invite(target_book_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  new_code text;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  if not public.is_adventure_book_member(target_book_id) then
    raise exception 'not_authorized';
  end if;

  loop
    new_code := upper(encode(gen_random_bytes(6), 'hex'));
    begin
      insert into public.adventure_book_invites (book_id, code, created_by)
      values (target_book_id, new_code, auth.uid());
      return new_code;
    exception when unique_violation then
      -- Try again with a fresh code.
    end;
  end loop;
end;
$$;

create or replace function public.join_adventure_book(invite_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  invite_row public.adventure_book_invites%rowtype;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  select *
    into invite_row
  from public.adventure_book_invites
  where code = upper(trim(invite_code))
    and revoked_at is null
    and expires_at > now()
  limit 1;

  if invite_row.id is null then
    raise exception 'invalid_or_expired_invite';
  end if;

  insert into public.adventure_book_members (book_id, user_id, role)
  values (invite_row.book_id, auth.uid(), 'editor')
  on conflict (book_id, user_id) do nothing;

  return invite_row.book_id;
end;
$$;

revoke all on function public.is_adventure_book_member(uuid) from public;
revoke all on function public.is_adventure_book_owner(uuid) from public;
revoke all on function public.is_adventure_book_storage_member(text) from public;
revoke all on function public.create_adventure_book(text) from public;
revoke all on function public.create_adventure_book_invite(uuid) from public;
revoke all on function public.join_adventure_book(text) from public;

grant execute on function public.is_adventure_book_member(uuid) to authenticated;
grant execute on function public.is_adventure_book_owner(uuid) to authenticated;
grant execute on function public.is_adventure_book_storage_member(text) to authenticated;
grant execute on function public.create_adventure_book(text) to authenticated;
grant execute on function public.create_adventure_book_invite(uuid) to authenticated;
grant execute on function public.join_adventure_book(text) to authenticated;

alter table public.adventure_books enable row level security;
alter table public.adventure_book_members enable row level security;
alter table public.adventure_book_invites enable row level security;
alter table public.adventure_entries enable row level security;
alter table public.adventure_photos enable row level security;
alter table public.adventure_settings enable row level security;

drop policy if exists "Adventure members can select books" on public.adventure_books;
create policy "Adventure members can select books"
  on public.adventure_books for select
  to authenticated
  using (public.is_adventure_book_member(id));

drop policy if exists "Adventure owners can update books" on public.adventure_books;
create policy "Adventure owners can update books"
  on public.adventure_books for update
  to authenticated
  using (public.is_adventure_book_owner(id))
  with check (public.is_adventure_book_owner(id));

drop policy if exists "Adventure owners can delete books" on public.adventure_books;
create policy "Adventure owners can delete books"
  on public.adventure_books for delete
  to authenticated
  using (public.is_adventure_book_owner(id));

drop policy if exists "Adventure members can select memberships" on public.adventure_book_members;
create policy "Adventure members can select memberships"
  on public.adventure_book_members for select
  to authenticated
  using (public.is_adventure_book_member(book_id));

drop policy if exists "Adventure owners can insert memberships" on public.adventure_book_members;
create policy "Adventure owners can insert memberships"
  on public.adventure_book_members for insert
  to authenticated
  with check (public.is_adventure_book_owner(book_id));

drop policy if exists "Adventure owners can update memberships" on public.adventure_book_members;
create policy "Adventure owners can update memberships"
  on public.adventure_book_members for update
  to authenticated
  using (public.is_adventure_book_owner(book_id))
  with check (public.is_adventure_book_owner(book_id));

drop policy if exists "Adventure owners can delete memberships" on public.adventure_book_members;
create policy "Adventure owners can delete memberships"
  on public.adventure_book_members for delete
  to authenticated
  using (public.is_adventure_book_owner(book_id));

drop policy if exists "Adventure owners can select invites" on public.adventure_book_invites;
create policy "Adventure owners can select invites"
  on public.adventure_book_invites for select
  to authenticated
  using (public.is_adventure_book_owner(book_id));

drop policy if exists "Adventure owners can insert invites" on public.adventure_book_invites;
create policy "Adventure owners can insert invites"
  on public.adventure_book_invites for insert
  to authenticated
  with check (public.is_adventure_book_owner(book_id));

drop policy if exists "Adventure owners can update invites" on public.adventure_book_invites;
create policy "Adventure owners can update invites"
  on public.adventure_book_invites for update
  to authenticated
  using (public.is_adventure_book_owner(book_id))
  with check (public.is_adventure_book_owner(book_id));

drop policy if exists "Adventure owners can delete invites" on public.adventure_book_invites;
create policy "Adventure owners can delete invites"
  on public.adventure_book_invites for delete
  to authenticated
  using (public.is_adventure_book_owner(book_id));

drop policy if exists "Adventure members can select entries" on public.adventure_entries;
create policy "Adventure members can select entries"
  on public.adventure_entries for select
  to authenticated
  using (public.is_adventure_book_member(book_id));

drop policy if exists "Adventure members can insert entries" on public.adventure_entries;
create policy "Adventure members can insert entries"
  on public.adventure_entries for insert
  to authenticated
  with check (public.is_adventure_book_member(book_id));

drop policy if exists "Adventure members can update entries" on public.adventure_entries;
create policy "Adventure members can update entries"
  on public.adventure_entries for update
  to authenticated
  using (public.is_adventure_book_member(book_id))
  with check (public.is_adventure_book_member(book_id));

drop policy if exists "Adventure members can delete entries" on public.adventure_entries;
create policy "Adventure members can delete entries"
  on public.adventure_entries for delete
  to authenticated
  using (public.is_adventure_book_member(book_id));

drop policy if exists "Adventure members can select photos" on public.adventure_photos;
create policy "Adventure members can select photos"
  on public.adventure_photos for select
  to authenticated
  using (public.is_adventure_book_member(book_id));

drop policy if exists "Adventure members can insert photos" on public.adventure_photos;
create policy "Adventure members can insert photos"
  on public.adventure_photos for insert
  to authenticated
  with check (public.is_adventure_book_member(book_id));

drop policy if exists "Adventure members can update photos" on public.adventure_photos;
create policy "Adventure members can update photos"
  on public.adventure_photos for update
  to authenticated
  using (public.is_adventure_book_member(book_id))
  with check (public.is_adventure_book_member(book_id));

drop policy if exists "Adventure members can delete photos" on public.adventure_photos;
create policy "Adventure members can delete photos"
  on public.adventure_photos for delete
  to authenticated
  using (public.is_adventure_book_member(book_id));

drop policy if exists "Adventure members can select settings" on public.adventure_settings;
create policy "Adventure members can select settings"
  on public.adventure_settings for select
  to authenticated
  using (public.is_adventure_book_member(book_id));

drop policy if exists "Adventure members can insert settings" on public.adventure_settings;
create policy "Adventure members can insert settings"
  on public.adventure_settings for insert
  to authenticated
  with check (public.is_adventure_book_member(book_id));

drop policy if exists "Adventure members can update settings" on public.adventure_settings;
create policy "Adventure members can update settings"
  on public.adventure_settings for update
  to authenticated
  using (public.is_adventure_book_member(book_id))
  with check (public.is_adventure_book_member(book_id));

drop policy if exists "Adventure members can delete settings" on public.adventure_settings;
create policy "Adventure members can delete settings"
  on public.adventure_settings for delete
  to authenticated
  using (public.is_adventure_book_member(book_id));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'adventure-book-photos',
  'adventure-book-photos',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Adventure members can read storage photos" on storage.objects;
create policy "Adventure members can read storage photos"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'adventure-book-photos'
    and public.is_adventure_book_storage_member(name)
  );

drop policy if exists "Adventure members can upload storage photos" on storage.objects;
create policy "Adventure members can upload storage photos"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'adventure-book-photos'
    and public.is_adventure_book_storage_member(name)
  );

drop policy if exists "Adventure members can update storage photos" on storage.objects;
create policy "Adventure members can update storage photos"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'adventure-book-photos'
    and public.is_adventure_book_storage_member(name)
  )
  with check (
    bucket_id = 'adventure-book-photos'
    and public.is_adventure_book_storage_member(name)
  );

drop policy if exists "Adventure members can delete storage photos" on storage.objects;
create policy "Adventure members can delete storage photos"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'adventure-book-photos'
    and public.is_adventure_book_storage_member(name)
  );
