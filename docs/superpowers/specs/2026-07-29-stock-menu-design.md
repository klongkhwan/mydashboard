# Stock menu design

## Purpose

Add a stock-focused navigation group that follows the existing expandable sidebar pattern. It gives users a direct route to market-monitoring widgets for Thai and global equities without introducing news feeds.

## Approved sidebar structure

```text
Stocks
├─ Market Overview   /dashboard/stocks
├─ Thai Stocks       /dashboard/stocks/thailand
├─ Global Markets    /dashboard/stocks/global
├─ Scanner           /dashboard/stocks/scanner
└─ Watchlist         /dashboard/stocks/watchlist
```

The visible labels should use the product's established language convention; Thai labels are the proposed default:

```text
หุ้น
├─ ภาพรวมตลาด
├─ หุ้นไทย
├─ ตลาดโลก
├─ Scanner
└─ Watchlist
```

## Page responsibilities and widgets

### ภาพรวมตลาด

The default landing page. Show widgets for the main indices (SET, SET50, NASDAQ, S&P 500, Dow Jones, Nikkei, and Hang Seng), market breadth (advancers versus decliners), and a compact preview of the user's watchlist. Do not include news widgets or a news feed.

### หุ้นไทย

Show SET and SET50, leading Thai stocks, and sector performance. This page is dedicated to the Thai equity market.

### ตลาดโลก

Combine US equities and ETFs on a single page. Show NASDAQ, S&P 500, and Dow Jones; a selection of large-cap US stocks; popular ETFs; and sector performance. ETF is deliberately not a top-level submenu.

### Scanner

Provide a stock discovery screen across Thai and international markets. Filters include market, index or sector, price, percent change, volume, market capitalization, and up/down state. Results should link into a stock detail or chart destination when that capability is added.

### Watchlist

Show the user's pinned stocks and ETFs with current price and percent change. It is the full version of the compact watchlist widget on Market Overview.

## Navigation behavior

Use the current sidebar's expandable-parent and same-level sub-item styling. The Stocks parent expands to these five routes; selecting a sub-item applies the existing active-state treatment. The parent contains no separate destination unless the existing navigation pattern requires one.

## Scope boundaries

- Include market data widgets, scanners, and watchlists only.
- Exclude news, editorial feeds, trading execution, alerts, and portfolio analytics from this first menu design.
- Keep ETF content inside Global Markets.

## Acceptance criteria

- The sidebar contains one Stocks parent with exactly five approved children.
- Market Overview includes indices, breadth, and a compact watchlist without news.
- Global Markets includes US stocks and ETFs in one destination.
- Scanner can express all seven approved filter dimensions.
