create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nis text,
  full_name text not null default '',
  guardian_name text,
  phone text,
  address text,
  class_id uuid references public.classes (id) on delete set null,
  room_id uuid references public.rooms (id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  description text not null,
  amount bigint not null check (amount >= 0),
  due_date date,
  created_at timestamptz not null default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices (id) on delete cascade,
  amount bigint not null check (amount > 0),
  paid_at date not null default current_date,
  note text,
  created_at timestamptz not null default now()
);

create table if not exists public.savings_transactions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  amount bigint not null check (amount <> 0),
  note text,
  transacted_at date not null default current_date,
  created_at timestamptz not null default now()
);

create index if not exists invoices_student_id_idx on public.invoices (student_id);
create index if not exists payments_invoice_id_idx on public.payments (invoice_id);
create index if not exists savings_transactions_student_id_idx on public.savings_transactions (student_id);

alter table public.classes enable row level security;
alter table public.rooms enable row level security;
alter table public.profiles enable row level security;
alter table public.invoices enable row level security;
alter table public.payments enable row level security;
alter table public.savings_transactions enable row level security;

drop policy if exists "Authenticated users can read classes" on public.classes;
create policy "Authenticated users can read classes"
  on public.classes for select to authenticated
  using (true);

drop policy if exists "Authenticated users can read rooms" on public.rooms;
create policy "Authenticated users can read rooms"
  on public.rooms for select to authenticated
  using (true);

drop policy if exists "Users can read their own profile" on public.profiles;
create policy "Users can read their own profile"
  on public.profiles for select to authenticated
  using ((select auth.uid()) = id);

drop policy if exists "Users can read their own invoices" on public.invoices;
create policy "Users can read their own invoices"
  on public.invoices for select to authenticated
  using ((select auth.uid()) = student_id);

drop policy if exists "Users can read payments for their own invoices" on public.payments;
create policy "Users can read payments for their own invoices"
  on public.payments for select to authenticated
  using (
    exists (
      select 1
      from public.invoices
      where invoices.id = payments.invoice_id
        and invoices.student_id = (select auth.uid())
    )
  );

drop policy if exists "Users can read their own savings transactions"
  on public.savings_transactions;
create policy "Users can read their own savings transactions"
  on public.savings_transactions for select to authenticated
  using ((select auth.uid()) = student_id);

grant usage on schema public to authenticated;
grant select on public.classes, public.rooms, public.profiles,
  public.invoices, public.payments, public.savings_transactions
  to authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

insert into public.profiles (id, full_name)
select id, coalesce(raw_user_meta_data ->> 'full_name', '')
from auth.users
on conflict (id) do nothing;

notify pgrst, 'reload schema';
