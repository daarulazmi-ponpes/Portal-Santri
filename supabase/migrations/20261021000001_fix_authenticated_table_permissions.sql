grant usage on schema public to authenticated;
grant select on public.classes, public.rooms, public.profiles,
  public.invoices, public.payments, public.savings_transactions
  to authenticated;

notify pgrst, 'reload schema';
