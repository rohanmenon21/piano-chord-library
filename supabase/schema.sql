create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Piano Player',
  email text,
  preferred_song_sort text not null default 'last_viewed',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.songs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Untitled Song',
  artist text not null default '',
  original_key text not null default 'C',
  saved_transpose integer not null default 0,
  saved_key text not null default 'C',
  content text not null default '',
  last_viewed_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.profiles
add column if not exists preferred_song_sort text not null default 'last_viewed';

alter table public.songs
add column if not exists last_viewed_at timestamptz not null default timezone('utc', now());

create index if not exists songs_user_id_updated_at_idx
on public.songs (user_id, updated_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

drop trigger if exists songs_set_updated_at on public.songs;
create trigger songs_set_updated_at
before update on public.songs
for each row
execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.songs enable row level security;

drop policy if exists "Profiles are viewable by owner" on public.profiles;
create policy "Profiles are viewable by owner"
on public.profiles
for select
using (auth.uid() = id);

drop policy if exists "Profiles are insertable by owner" on public.profiles;
create policy "Profiles are insertable by owner"
on public.profiles
for insert
with check (auth.uid() = id);

drop policy if exists "Profiles are updatable by owner" on public.profiles;
create policy "Profiles are updatable by owner"
on public.profiles
for update
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "Songs are viewable by owner" on public.songs;
create policy "Songs are viewable by owner"
on public.songs
for select
using (auth.uid() = user_id);

drop policy if exists "Songs are insertable by owner" on public.songs;
create policy "Songs are insertable by owner"
on public.songs
for insert
with check (auth.uid() = user_id);

drop policy if exists "Songs are updatable by owner" on public.songs;
create policy "Songs are updatable by owner"
on public.songs
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Songs are deletable by owner" on public.songs;
create policy "Songs are deletable by owner"
on public.songs
for delete
using (auth.uid() = user_id);
