create table if not exists public.portal_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.portal_admins enable row level security;
revoke all on public.portal_admins from anon, authenticated;

create or replace function public.is_portal_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.portal_admins
    where user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_portal_admin() from public, anon;
grant execute on function public.is_portal_admin() to authenticated;

grant insert on public.classes, public.rooms, public.invoices,
  public.payments, public.savings_transactions to authenticated;
grant update on public.profiles to authenticated;

drop policy if exists "Admins can read all profiles" on public.profiles;
create policy "Admins can read all profiles"
  on public.profiles for select to authenticated
  using ((select public.is_portal_admin()));

drop policy if exists "Admins can update profiles" on public.profiles;
create policy "Admins can update profiles"
  on public.profiles for update to authenticated
  using ((select public.is_portal_admin()))
  with check ((select public.is_portal_admin()));

drop policy if exists "Admins can read all invoices" on public.invoices;
create policy "Admins can read all invoices"
  on public.invoices for select to authenticated
  using ((select public.is_portal_admin()));

drop policy if exists "Admins can insert invoices" on public.invoices;
create policy "Admins can insert invoices"
  on public.invoices for insert to authenticated
  with check ((select public.is_portal_admin()));

drop policy if exists "Admins can read all payments" on public.payments;
create policy "Admins can read all payments"
  on public.payments for select to authenticated
  using ((select public.is_portal_admin()));

drop policy if exists "Admins can insert payments" on public.payments;
create policy "Admins can insert payments"
  on public.payments for insert to authenticated
  with check ((select public.is_portal_admin()));

drop policy if exists "Admins can read all savings transactions"
  on public.savings_transactions;
create policy "Admins can read all savings transactions"
  on public.savings_transactions for select to authenticated
  using ((select public.is_portal_admin()));

drop policy if exists "Admins can insert savings transactions"
  on public.savings_transactions;
create policy "Admins can insert savings transactions"
  on public.savings_transactions for insert to authenticated
  with check ((select public.is_portal_admin()));

drop policy if exists "Admins can insert classes" on public.classes;
create policy "Admins can insert classes"
  on public.classes for insert to authenticated
  with check ((select public.is_portal_admin()));

drop policy if exists "Admins can insert rooms" on public.rooms;
create policy "Admins can insert rooms"
  on public.rooms for insert to authenticated
  with check ((select public.is_portal_admin()));

notify pgrst, 'reload schema';
