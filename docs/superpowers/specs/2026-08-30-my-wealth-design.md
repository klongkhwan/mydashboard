# My Wealth Design

## Goal

Replace the existing **My Trade** area with **My Wealth**, a manual-first personal-finance workspace for income, expenses, monthly budgets, and investment portfolios. The first release does not migrate or preserve the existing `trades_simple` data and does not connect to provider APIs.

## Product scope

My Wealth is the single sidebar entry point for personal money management. It replaces the existing **My Trade** item and is available at `/dashboard/my-wealth`.

### Navigation

- **ภาพรวม** — monthly dashboard and recent activity.
- **รายรับ** — create, edit, delete, filter, and search income transactions.
- **ค่าใช้จ่าย** — create, edit, delete, filter, and search expense transactions.
- **งบประมาณ** — set and compare monthly budgets by expense category.
- **การลงทุน** — portfolio entries grouped by Dime, Bybit Trade, Bybit Dual Asset, and Binance TH.
- **หมวดหมู่และการตั้งค่า** — manage user-defined income and expense categories and financial accounts.

The dashboard and all financial summaries use Thai baht (THB). Foreign shares and crypto are entered at the THB value that the user wants to report; exchange-rate conversion is explicitly out of scope for this release.

## User experience

### Overview dashboard

The top-level page has a month/year selector and a prominent add-transaction action. Its content is scoped to the selected month, except portfolio value, which uses the latest manually saved value for each holding.

1. **Summary cards** show monthly income, monthly expenses, net cash flow, budget spent and remaining, and latest total portfolio value.
2. **Daily cash-flow chart** shows income, expenses, and cumulative net cash flow by day of the selected month.
3. **Budget progress** shows actual spend against every active expense-category budget. Progress is normal below 80%, warning from 80% up to the budget, and over-budget once actual spend exceeds it.
4. **Investment overview** groups current value by Dime, Bybit Trade, Bybit Dual Asset, and Binance TH.
5. **Recent activity** combines recent cash transactions and recent holding updates, clearly labelled by type.

### Transactions and transfers

Users create a single transaction record for income, expenses, or transfers.

- An **income** transaction adds money to one account and must have an active income category.
- An **expense** transaction removes money from one account and must have an active expense category.
- A **transfer** moves money from one owned account to another. It is excluded from income, expense, and budget calculations so funding an investment does not become an expense.

Each transaction contains a date, THB amount, account, optional category according to its type, note, and timestamps. Transfers have both a source and destination account.

### Investments

Portfolio records are manually maintained; they do not represent live balances. A holding has a provider/account, product type, display name and optional symbol, quantity, cost basis, current THB value, last-updated date, and optional note.

Supported product types in the initial UI are:

- Dime: Thai stock and foreign stock.
- Bybit: trading and dual asset.
- Binance TH: trading and crypto holding.

Holding changes update the displayed portfolio value. They do not automatically create a cash transaction; users record the related transfer or expense/income separately when needed.

### Categories and budgets

Initial categories are seeded per user and remain fully user managed.

- Income: เงินเดือน, ขายของ/ส่วนต่าง, อื่น ๆ.
- Expense: ค่ากิน, ค่าน้ำค่าไฟ, ค่าของใช้, อื่น ๆ.

Users can add, rename, colour-code, reorder, or archive categories. Archived categories remain visible on historical transactions but cannot be selected for new transactions.

One monthly budget is allowed for each expense category and month. Users can create, update, or remove it. A missing budget means that category is not included in the budget total.

## Data model

### `wealth_accounts`

Stores money containers and investment providers.

| Column | Notes |
|---|---|
| `id` | UUID primary key |
| `user_id` | references `auth.users(id)` |
| `name` | user-visible account name |
| `kind` | `cash` or `investment` |
| `provider` | `manual`, `dime`, `bybit`, or `binance_th` |
| `is_active` | archived accounts cannot be selected for new entries |
| `created_at`, `updated_at` | timestamps |

### `wealth_categories`

| Column | Notes |
|---|---|
| `id` | UUID primary key |
| `user_id` | references `auth.users(id)` |
| `name` | unique per user and category type |
| `type` | `income` or `expense` |
| `color` | optional UI colour token |
| `sort_order` | stable display order |
| `is_active` | archive instead of delete when in use |
| `created_at`, `updated_at` | timestamps |

### `wealth_transactions`

| Column | Notes |
|---|---|
| `id` | UUID primary key |
| `user_id` | references `auth.users(id)` |
| `transaction_date` | user-selected local calendar date |
| `type` | `income`, `expense`, or `transfer` |
| `amount_thb` | positive numeric value; direction is defined by `type` |
| `account_id` | income/expense account, or transfer source account |
| `destination_account_id` | required only for a transfer |
| `category_id` | required for income/expense and null for transfer |
| `note` | optional free text |
| `created_at`, `updated_at` | timestamps |

Database constraints enforce a positive amount, prohibit transfer to the same account, require the destination for transfers, and require the correct category presence for income and expenses.

### `wealth_budgets`

| Column | Notes |
|---|---|
| `id` | UUID primary key |
| `user_id` | references `auth.users(id)` |
| `category_id` | references an expense category |
| `budget_month` | first day of the applicable month |
| `amount_thb` | positive budget amount |
| `created_at`, `updated_at` | timestamps |

`(user_id, category_id, budget_month)` is unique.

### `wealth_holdings`

| Column | Notes |
|---|---|
| `id` | UUID primary key |
| `user_id` | references `auth.users(id)` |
| `account_id` | references an active investment account |
| `product_type` | `thai_stock`, `foreign_stock`, `crypto`, `bybit_trade`, or `dual_asset` |
| `name`, `symbol` | display name and optional market symbol |
| `quantity` | optional positive numeric quantity |
| `cost_basis_thb` | optional total cost in THB |
| `current_value_thb` | required latest reported value in THB |
| `valuation_date` | date the user updated the value |
| `note` | optional free text |
| `created_at`, `updated_at` | timestamps |

## Security and integrity

Each table enables Supabase Row Level Security. Select, insert, update, and delete policies require `auth.uid() = user_id`; client-supplied `user_id` is rejected or overwritten by authenticated server actions. Foreign-key ownership is checked in server actions before linking accounts, categories, budgets, transactions, and holdings.

Indexes cover `user_id` together with transaction date, budget month, account, category, and holding valuation date. All tables use the project’s existing `updated_at` trigger pattern.

## Application architecture

- Keep UI components under `components/my-wealth/`, split by dashboard, transactions, budgets, investments, and settings responsibilities.
- Put authenticated server operations and derived dashboard calculations in `lib/my-wealth.ts`.
- Define shared Zod schemas and TypeScript types in `app/dashboard/my-wealth/schema.ts`.
- Use the existing Supabase server client and the project’s shadcn-style UI components.
- Keep calculations server-side and return only serializable dashboard view models to client components.

## Out of scope

- Provider API integration, credentials, sync jobs, webhooks, and live prices.
- Automatic FX conversion and non-THB consolidated reporting.
- Migration of `trades_simple` records or retention of the My Trade UI.
- Bank reconciliation, receipt scanning, recurring transactions, and notifications.
