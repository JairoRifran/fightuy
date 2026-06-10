create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null,
  email text,
  role text not null default 'player' check (role in ('player', 'owner')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles
add column if not exists role text not null default 'player';

create table if not exists public.character_entitlements (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  character_id text not null,
  source text not null default 'purchase',
  created_at timestamptz not null default now(),
  unique (user_id, character_id)
);

create table if not exists public.payments (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null default 'manual',
  provider_payment_id text,
  product_type text not null default 'character',
  product_id text not null,
  amount_cents integer not null default 0,
  currency text not null default 'USD',
  status text not null default 'paid',
  created_at timestamptz not null default now()
);

create table if not exists public.app_events (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete set null,
  event_name text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.character_entitlements enable row level security;
alter table public.payments enable row level security;
alter table public.app_events enable row level security;

create or replace function public.is_owner()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'owner'
  );
$$;

drop policy if exists "profiles are readable by owner" on public.profiles;
drop policy if exists "owners can read all profiles" on public.profiles;
drop policy if exists "profiles can be inserted by owner" on public.profiles;
drop policy if exists "profiles can be updated by owner" on public.profiles;
drop policy if exists "entitlements are readable by owner" on public.character_entitlements;
drop policy if exists "owners can read all entitlements" on public.character_entitlements;
drop policy if exists "users can read own payments" on public.payments;
drop policy if exists "owners can read all payments" on public.payments;
drop policy if exists "users can insert own app events" on public.app_events;
drop policy if exists "users can read own app events" on public.app_events;
drop policy if exists "owners can read all app events" on public.app_events;

create policy "profiles are readable by owner"
on public.profiles for select
using (auth.uid() = id);

create policy "owners can read all profiles"
on public.profiles for select
using (public.is_owner());

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

create policy "owners can read all entitlements"
on public.character_entitlements for select
using (public.is_owner());

create policy "users can read own payments"
on public.payments for select
using (auth.uid() = user_id);

create policy "owners can read all payments"
on public.payments for select
using (public.is_owner());

create policy "users can insert own app events"
on public.app_events for insert
with check (auth.uid() = user_id);

create policy "users can read own app events"
on public.app_events for select
using (auth.uid() = user_id);

create policy "owners can read all app events"
on public.app_events for select
using (public.is_owner());

create or replace function public.get_owner_dashboard()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  if not public.is_owner() then
    raise exception 'not_authorized';
  end if;

  select jsonb_build_object(
    'totals', jsonb_build_object(
      'users', (select count(*) from public.profiles),
      'paying_users', (select count(distinct user_id) from public.payments where status = 'paid'),
      'payments', (select count(*) from public.payments where status = 'paid'),
      'revenue_cents', coalesce((select sum(amount_cents) from public.payments where status = 'paid'), 0),
      'events_24h', (select count(*) from public.app_events where created_at >= now() - interval '24 hours')
    ),
    'recent_users', coalesce((
      select jsonb_agg(row_to_json(t))
      from (
        select id, username, email, role, created_at
        from public.profiles
        order by created_at desc
        limit 12
      ) t
    ), '[]'::jsonb),
    'recent_events', coalesce((
      select jsonb_agg(row_to_json(t))
      from (
        select e.event_name, e.metadata, e.created_at, p.username, p.email
        from public.app_events e
        left join public.profiles p on p.id = e.user_id
        order by e.created_at desc
        limit 20
      ) t
    ), '[]'::jsonb),
    'purchases_by_character', coalesce((
      select jsonb_agg(row_to_json(t))
      from (
        select product_id as character_id, count(*) as sales, coalesce(sum(amount_cents), 0) as revenue_cents
        from public.payments
        where status = 'paid'
          and product_type = 'character'
        group by product_id
        order by sales desc
      ) t
    ), '[]'::jsonb)
  ) into result;

  return result;
end;
$$;

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

update public.profiles
set role = 'owner'
where lower(email) = 'rifranjairo@gmail.com';
