# Wealth Ledger — Personal Indian Stocks & Mutual Funds Portfolio

A production-ready, personal investment ledger and wealth dashboard engineered to run at **₹0 recurring cost** using free, open-source services and free public API tiers.

This application is built as a **long-term financial source of truth**. Even if all external market APIs were to disappear tomorrow, all transactions, SIP history, holdings, monthly snapshots, and investment records remain permanently preserved in your persistent database.

---

> **Project status:** Personal finance tracking software, not financial advice. Verify imported transactions, holdings, corporate actions, and market data against primary statements/providers before making investment decisions.


## 🌟 Key Architecture & Highlights

- **100% Free / Open-Source Architecture (₹0/month)**:
  - **Database**: Cloud Turso (libSQL) / local persistent SQLite via Drizzle ORM.
  - **Mutual Funds Data**: Free AMFI public feeds via MFAPI.in (and mfnav.in fallback). Zero API keys required.
  - **Indian Equities Data**: Free NSE & BSE public market feeds with `.NS` and `.BO` ticker resolution. Zero API keys required.
  - **Hosting**: Vercel Serverless free tier or local Node.js server.
- **Provider Abstraction Layer (`lib/market-data`)**:
  - `MarketDataProvider` orchestrator with multi-tiered caching, TTL enforcement, and rate-limit safety.
  - If external market APIs fail, the dashboard gracefully falls back to the last-known cached price with `"Last updated: ..."` — never breaking the interface or fabricating values.
- **Dedicated SIP Manager & Calendar (`/sips`)**:
  - Never overwrites historical SIP installments.
  - Preserves parameter adjustments (e.g. ₹2,500/mo in Jan–Jun, ₹3,000/mo from Jul onward).
  - Installment execution automatically writes an audited transaction into the ledger with exact units and NAV.
- **Accurate Extended Internal Rate of Return (XIRR)**:
  - Robust Newton-Raphson solver with bisection fallback.
  - Day-count fractional cash-flow weighting for purchases, redemptions, dividends, and multi-year SIP schedules.
- **Permanent Monthly Snapshot Engine (`/monthly-review`)**:
  - Captures historical portfolio snapshots at month-end or on-demand.
  - Enables the **Portfolio Growth Chart** to render genuine historical progression without reconstructing the past using today's holdings.
- **Audit Ledger & Financial Safety (`/transactions`)**:
  - Soft-deletion protection (`is_deleted: true`) so records are never silently erased.
  - Full CSV transaction import, CSV export, and complete 1-click JSON database backup and restore.

---

## 🧭 Application Sitemap & Views

| Route | View | Description |
|---|---|---|
| `/` | **Dashboard** | Total Portfolio, Invested, Gain, XIRR, Portfolio Growth Chart (1M–All), Monthly Inflow Chart, Asset Allocation Donut, SIPs This Month, Performance Table |
| `/portfolio` | **Portfolio** | Full asset cards, category badges, cost basis, valuation, and return percentages |
| `/mutual-funds` | **Mutual Funds** | 40,000+ AMFI scheme search, direct/regular NAV tracker, SIP & lumpsum entry modal |
| `/stocks` | **Stocks** | Indian equities portfolio (NSE/BSE), live price feed, unrealized & realized P&L, dividend income |
| `/investments/[id]` | **Investment Detail** | Dual-mode chart (NAV history & personal investment evolution), transaction history, units held |
| `/sips` | **SIP Manager** | Plan status controls (Active, Paused, Stopped), installment execution, monthly calendar |
| `/transactions` | **Ledger** | Filterable transaction table (SIP, Buy, Sell, Redemption, Dividend) with soft-delete |
| `/analytics` | **Analytics** | NIFTY 50 / SENSEX benchmark comparison chart, category allocation bars, concentration risk |
| `/monthly-review` | **Monthly Review** | Historical month selector, waterfall ledger (Opening, Contributions, Market Gain, Closing), best/worst performers |
| `/yearly-review` | **Yearly Review** | Annual capital contributions, average monthly savings, SIP installment counts, compounding XIRR |
| `/goals` | **Goals Tracker** | Target corpus milestones, capital gap, and conservative estimated monthly SIP requirements |
| `/import` | **Import & Export** | Bulk CSV transaction import, CSV ledger export, full JSON database backup & restore |
| `/settings` | **Settings & Health** | Cloud infrastructure status, system sync trigger, and password update |
| `/login` | **Authentication** | Secure HTTP-only session login with Personal Mode protection |

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- Node.js 18+ (Tested on Node.js v24)
- npm or pnpm

### 2. Installation
```bash
# Clone the repository
git clone <repo-url>
cd "INVESTMENTS DASHBOARD PROJECT"

# Install dependencies
npm install
```

### 3. Environment Setup
Copy the template environment file:
```bash
cp .env.example .env.local
```

For **zero-config local SQLite** (ready out of the box with zero external accounts):
```env
TURSO_DATABASE_URL=file:local.db
TURSO_AUTH_TOKEN=
AUTH_SECRET=personal_portfolio_secret_key_change_in_production_min32chars
STOCK_API_URL=https://query1.finance.yahoo.com
MUTUAL_FUND_API_URL=https://api.mfapi.in
CRON_SECRET=super_secret_cron_key_for_automated_sync
PERSONAL_MODE=true
```

For **persistent cloud deployment with Turso free tier**:
1. Create a free database at [turso.tech](https://turso.tech).
2. Set `TURSO_DATABASE_URL=libsql://your-db-name.turso.io` and `TURSO_AUTH_TOKEN=your-token`.

### 4. Database Initialization
```bash
npm run db:push
```

### 5. Run the Application
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

- Default Owner Login: `owner@investments.local`
- Default Password: `investor123`
*(Can be customized or changed in `/settings`)*

---

## 🧪 Automated Testing

Run the Vitest test suite covering XIRR calculations, SIP installment preservation, and monthly snapshot generation:
```bash
npm test
```

---

## 🔄 Scheduled Automated Execution (Cron)

To automatically refresh market NAVs and generate monthly snapshots on a schedule for ₹0, trigger the `/api/sync` endpoint using GitHub Actions, Vercel Cron, or a local cron job:

```bash
curl -X POST https://your-domain.vercel.app/api/sync \
  -H "Authorization: Bearer super_secret_cron_key_for_automated_sync"
```

Alternatively, click the **"Update Portfolio"** button in the header at any time.

---

## 📄 License
MIT License. Free and open-source for personal investment tracking.
