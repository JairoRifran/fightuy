create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.character_entitlements (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  character_id text not null,
  source text not null default 'purchase',
  created_at timestamptz not null default now(),
  unique (user_id, character_id)
);

alter table public.profiles enable row level security;
alter table public.character_entitlements enable row level security;

create policy "profiles are readable by owner"
on public.profiles for select
using (auth.uid() = id);

create policy "profiles can be inserted by owner"
on public.profiles for insert
with check (auth.uid() = id);

create policy "profiles can be updated by owner"
on public.profiles for update
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "entitlements are readable by owner"
on public.character_entitlements for select
using (auth.uid() = user_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1), 'jugador'),
    new.email
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();
