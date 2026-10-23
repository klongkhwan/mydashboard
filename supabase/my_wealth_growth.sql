-- Run after my_wealth.sql, which defines set_my_wealth_updated_at().
create table if not exists public.wealth_growth_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  activity_date date not null default (timezone('Asia/Bangkok', now())::date)
    check (activity_date >= date '0001-01-01' and activity_date <= timezone('Asia/Bangkok', now())::date),
  category text not null check (category in ('reading', 'podcast', 'course', 'practice', 'other')),
  title text not null check (char_length(trim(title)) between 1 and 200),
  duration_minutes integer check (duration_minutes between 1 and 1440),
  notes text check (notes is null or char_length(trim(notes)) between 1 and 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists wealth_growth_logs_user_date_idx
  on public.wealth_growth_logs(user_id, activity_date desc);

drop trigger if exists wealth_growth_logs_updated_at on public.wealth_growth_logs;
create trigger wealth_growth_logs_updated_at before update on public.wealth_growth_logs
for each row execute function public.set_my_wealth_updated_at();

alter table public.wealth_growth_logs enable row level security;

drop policy if exists "Users manage own growth logs" on public.wealth_growth_logs;
create policy "Users manage own growth logs" on public.wealth_growth_logs
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

revoke all on public.wealth_growth_logs from public, anon, authenticated;
grant select, insert, update, delete on public.wealth_growth_logs to authenticated;
