create extension if not exists pgcrypto;

create table if not exists public.wealth_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) > 0),
  type text not null check (type in ('income', 'expense')),
  color text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, type, name)
);

create table if not exists public.wealth_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('income', 'expense')),
  transaction_date date not null,
  amount_thb numeric(18, 2) not null check (amount_thb > 0),
  category_id uuid not null references public.wealth_categories(id),
  merchant_or_payer text,
  description text,
  note text,
  payment_status text not null default 'paid' check (payment_status in ('paid', 'pending')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((type = 'income' and payment_status = 'paid') or type = 'expense')
);

create table if not exists public.wealth_investments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  platform text not null check (platform in ('dime', 'bybit', 'binance_th')),
  investment_type text not null check (investment_type in ('thai_stock', 'foreign_stock', 'spot_trade', 'futures_trade', 'crypto_holding', 'dual_asset')),
  asset_symbol text not null,
  quote_asset text,
  display_name text,
  quantity numeric(24, 8),
  entry_price numeric(24, 8),
  opened_amount_thb numeric(18, 2) not null check (opened_amount_thb > 0),
  entry_fee_thb numeric(18, 2) not null default 0 check (entry_fee_thb >= 0),
  opened_at date not null,
  trade_side text check (trade_side in ('buy', 'sell', 'long', 'short')),
  leverage numeric(10, 2) check (leverage > 0),
  status text not null default 'open' check (status in ('open', 'closed', 'cancelled')),
  exit_price numeric(24, 8),
  closed_amount_thb numeric(18, 2) check (closed_amount_thb > 0),
  exit_fee_thb numeric(18, 2) not null default 0 check (exit_fee_thb >= 0),
  closed_at date,
  dual_strategy text check (dual_strategy in ('buy_low', 'sell_high')),
  deposit_asset text,
  deposit_amount numeric(24, 8) check (deposit_amount > 0),
  target_price numeric(24, 8) check (target_price > 0),
  apr_percent numeric(10, 4) check (apr_percent >= 0),
  term_days integer check (term_days > 0),
  settlement_date date,
  settlement_asset text,
  settlement_amount numeric(24, 8) check (settlement_amount >= 0),
  interest_amount numeric(24, 8) check (interest_amount >= 0),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((status = 'closed' and closed_at is not null and closed_amount_thb is not null) or status <> 'closed')
);

create index if not exists wealth_transactions_user_date_idx on public.wealth_transactions(user_id, transaction_date);
create index if not exists wealth_transactions_user_status_date_idx on public.wealth_transactions(user_id, type, payment_status, transaction_date);
create index if not exists wealth_investments_user_opened_idx on public.wealth_investments(user_id, opened_at);
create index if not exists wealth_investments_user_closed_idx on public.wealth_investments(user_id, closed_at);
create index if not exists wealth_investments_user_platform_status_idx on public.wealth_investments(user_id, platform, status);

create or replace function public.set_my_wealth_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists wealth_categories_updated_at on public.wealth_categories;
create trigger wealth_categories_updated_at before update on public.wealth_categories
for each row execute function public.set_my_wealth_updated_at();
drop trigger if exists wealth_transactions_updated_at on public.wealth_transactions;
create trigger wealth_transactions_updated_at before update on public.wealth_transactions
for each row execute function public.set_my_wealth_updated_at();
drop trigger if exists wealth_investments_updated_at on public.wealth_investments;
create trigger wealth_investments_updated_at before update on public.wealth_investments
for each row execute function public.set_my_wealth_updated_at();

alter table public.wealth_categories enable row level security;
alter table public.wealth_transactions enable row level security;
alter table public.wealth_investments enable row level security;

create policy "Users manage own wealth categories" on public.wealth_categories for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own wealth transactions" on public.wealth_transactions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own wealth investments" on public.wealth_investments for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
