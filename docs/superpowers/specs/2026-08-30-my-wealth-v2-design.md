# My Wealth Final Design

## Goal
Replace My Trade with My Wealth: a manual THB cash-flow dashboard combining income, paid expenses, and investment cash events by day and month. Existing My Trade UI and data need no migration.

## Navigation
`/dashboard/my-wealth` replaces My Trade and provides four views:
- ภาพรวม: month/year dashboard and daily activity.
- รายการเงิน: one list filtered by all, income, paid expenses, or pending expenses.
- การลงทุน: Dime, Bybit, and Binance TH entries grouped in the UI.
- หมวดหมู่: user-managed income and expense categories.

## Data
- `wealth_categories`: user-owned name, type (`income` or `expense`), color, sort order, and active state. Seed เงินเดือน, ขายของ/ส่วนต่าง, อื่น ๆ, ค่ากิน, ค่าน้ำค่าไฟ, and ค่าของใช้.
- `wealth_transactions`: user-owned income/expense, date, positive THB amount, category, merchant or payer, description, note, and expense state (`paid` or `pending`). No accounts, balances, transfers, or budgets.
- `wealth_investments`: user-owned Dime/Bybit/Binance TH position with platform, type, asset, quantity, entry data, close data, fees, status (`open`, `closed`, `cancelled`), note, and nullable trade/dual-asset fields. Dual Asset adds strategy (`buy_low`/`sell_high`), deposit, target, APR, term, settlement, and interest. No current value, dividend, or editable P&L.

## Dashboard calculation
For each day: `income - paid expenses - investment openings + investment closings = net`. An investment opening is `opened_amount_thb + entry_fee_thb`; a close is `closed_amount_thb - exit_fee_thb`. Pending expenses stay separate. P&L is calculated from investment entry/exit data and investment cash events never create duplicate income rows.

## Security and scope
All tables use RLS with `auth.uid() = user_id`; authenticated server actions validate Zod payloads and ownership. Provider APIs, live prices, FX conversion, recurring entries, receipt scanning, notifications, accounts, transfers, budgets, and My Trade migration are out of scope.
