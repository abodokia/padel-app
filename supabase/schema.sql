-- Padel court: profiles + bookings (copy into Supabase SQL Editor)
-- Run once per project. Requires Supabase Auth (Email) enabled.

-- ---------------------------------------------------------------------------
-- profiles: one row per auth user (filled by trigger on signup)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null default '',
  name text not null default 'Player',
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Profiles: users can read own row"
  on public.profiles for select
  to authenticated
  using (auth.uid() = id);

create policy "Profiles: users can update own row"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ---------------------------------------------------------------------------
-- bookings: one row per court hour per calendar day (local date_key)
-- ---------------------------------------------------------------------------
create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  date_key text not null,
  hour smallint not null,
  created_at timestamptz not null default now(),
  constraint bookings_hour_range check (hour >= 9 and hour < 22),
  constraint bookings_one_slot_per_hour unique (date_key, hour)
);

create index if not exists bookings_date_key_idx on public.bookings (date_key);
create index if not exists bookings_user_id_idx on public.bookings (user_id);

alter table public.bookings enable row level security;

create policy "Bookings: authenticated read all"
  on public.bookings for select
  to authenticated
  using (true);

create policy "Bookings: insert own user_id only"
  on public.bookings for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Bookings: delete own rows"
  on public.bookings for delete
  to authenticated
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Auto-create profile when a new auth user is created
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, name)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(
      new.raw_user_meta_data->>'name',
      new.raw_user_meta_data->>'full_name',
      split_part(coalesce(new.email, ''), '@', 1),
      'Player'
    )
  )
  on conflict (id) do update
    set email = excluded.email,
        name = excluded.name;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Realtime: live grid updates
-- If this errors with "already member of publication", skip it — table is set.
-- ---------------------------------------------------------------------------
alter publication supabase_realtime add table public.bookings;
