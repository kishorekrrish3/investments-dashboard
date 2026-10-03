import { sql } from "drizzle-orm";
import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

/**
 * Common timestamp helpers: store as ISO 8601 UTC string (YYYY-MM-DDTHH:mm:ss.sssZ)
 */
const timestamps = {
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
};

// 1. Users Table
export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull().default("OWNER"), // OWNER, VIEWER
  ...timestamps,
});

// 2. Portfolios Table
export const portfolios = sqliteTable("portfolios", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull().default("My Investments"),
  isDefault: integer("is_default", { mode: "boolean" }).notNull().default(true),
  description: text("description"),
  ...timestamps,
});

// 3. Assets Table (Mutual Funds, Stocks, ETF, Cash)
export const assets = sqliteTable("assets", {
  id: text("id").primaryKey(),
  portfolioId: text("portfolio_id")
    .notNull()
    .references(() => portfolios.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // 'MUTUAL_FUND' | 'STOCK' | 'ETF' | 'CASH'
  symbolOrCode: text("symbol_or_code").notNull(), // Scheme code or Stock ticker (e.g. "120503" or "RELIANCE.NS")
  name: text("name").notNull(),
  isin: text("isin"),
  exchange: text("exchange"), // 'NSE' | 'BSE' | 'AMFI'
  category: text("category"), // 'Large Cap', 'Flexi Cap', 'Mid Cap', etc.
  amc: text("amc"), // AMC name (for MFs)
  sector: text("sector"), // Sector (for Stocks)
  status: text("status").notNull().default("ACTIVE"), // 'ACTIVE' | 'ARCHIVED'
  ...timestamps,
});

// 4. Stocks Metadata Table
export const stocks = sqliteTable("stocks", {
  id: text("id").primaryKey(),
  assetId: text("asset_id")
    .notNull()
    .references(() => assets.id, { onDelete: "cascade" }),
  symbol: text("symbol").notNull(),
  exchange: text("exchange").notNull().default("NSE"), // 'NSE' | 'BSE'
  companyName: text("company_name").notNull(),
  sector: text("sector"),
  industry: text("industry"),
  isin: text("isin"),
  marketCap: text("market_cap"), // Large, Mid, Small
  ...timestamps,
});

// 5. Mutual Funds Metadata Table
export const mutualFunds = sqliteTable("mutual_funds", {
  id: text("id").primaryKey(),
  assetId: text("asset_id")
    .notNull()
    .references(() => assets.id, { onDelete: "cascade" }),
  schemeCode: text("scheme_code").notNull(),
  schemeName: text("scheme_name").notNull(),
  amc: text("amc"),
  category: text("category"),
  schemeType: text("scheme_type"), // Open Ended, Close Ended
  schemeCategory: text("scheme_category"),
  isinGrowth: text("isin_growth"),
  isinReinv: text("isin_reinv"),
  plan: text("plan").default("DIRECT"), // DIRECT, REGULAR
  option: text("option").default("GROWTH"), // GROWTH, IDCW
  ...timestamps,
});

// 6. Transactions Table
export const transactions = sqliteTable("transactions", {
  id: text("id").primaryKey(),
  portfolioId: text("portfolio_id")
    .notNull()
    .references(() => portfolios.id, { onDelete: "cascade" }),
  assetId: text("asset_id")
    .notNull()
    .references(() => assets.id, { onDelete: "cascade" }),
  transactionType: text("transaction_type").notNull(), // 'BUY', 'SELL', 'SIP', 'REDEMPTION', 'SWITCH', 'DIVIDEND'
  transactionDate: text("transaction_date").notNull(), // 'YYYY-MM-DD'
  quantity: real("quantity").notNull(), // Units for MF or shares count for stocks
  priceOrNav: real("price_or_nav").notNull(), // Purchase price or NAV
  amount: real("amount").notNull(), // Total cash flow: quantity * price_or_nav + fees + taxes
  fees: real("fees").notNull().default(0),
  taxes: real("taxes").notNull().default(0),
  notes: text("notes"),
  isDeleted: integer("is_deleted", { mode: "boolean" }).notNull().default(false), // Soft delete
  ...timestamps,
});

// 7. SIP Plans Table
export const sipPlans = sqliteTable("sip_plans", {
  id: text("id").primaryKey(),
  portfolioId: text("portfolio_id")
    .notNull()
    .references(() => portfolios.id, { onDelete: "cascade" }),
  assetId: text("asset_id")
    .notNull()
    .references(() => assets.id, { onDelete: "cascade" }),
  monthlyAmount: real("monthly_amount").notNull(),
  sipDate: integer("sip_date").notNull(), // Day of month: 1 - 31
  frequency: text("frequency").notNull().default("MONTHLY"), // 'MONTHLY', 'QUARTERLY'
  startDate: text("start_date").notNull(), // 'YYYY-MM-DD'
  endDate: text("end_date"), // 'YYYY-MM-DD' or null if ongoing
  status: text("status").notNull().default("ACTIVE"), // 'ACTIVE', 'PAUSED', 'STOPPED'
  notes: text("notes"),
  ...timestamps,
});

// 8. SIP Installments Table (Preserving historical installments)
export const sipInstallments = sqliteTable("sip_installments", {
  id: text("id").primaryKey(),
  sipPlanId: text("sip_plan_id")
    .notNull()
    .references(() => sipPlans.id, { onDelete: "cascade" }),
  scheduledDate: text("scheduled_date").notNull(), // 'YYYY-MM-DD'
  actualDate: text("actual_date"), // 'YYYY-MM-DD'
  amount: real("amount").notNull(),
  nav: real("nav"),
  units: real("units"),
  status: text("status").notNull().default("SCHEDULED"), // 'SCHEDULED', 'COMPLETED', 'MISSED', 'SKIPPED'
  transactionId: text("transaction_id").references(() => transactions.id, { onDelete: "set null" }),
  notes: text("notes"),
  ...timestamps,
});

// 9. Market Prices Cache (For Stocks)
export const marketPrices = sqliteTable("market_prices", {
  id: text("id").primaryKey(),
  symbol: text("symbol").notNull().unique(), // e.g. "RELIANCE.NS"
  exchange: text("exchange").notNull().default("NSE"),
  price: real("price").notNull(),
  change: real("change").notNull().default(0),
  changePercent: real("change_percent").notNull().default(0),
  volume: real("volume").default(0),
  dataTimestamp: text("data_timestamp").notNull(),
  source: text("source").notNull().default("YAHOO_NSE"),
  ...timestamps,
});

// 10. NAV History Cache (For Mutual Funds)
export const navHistory = sqliteTable("nav_history", {
  id: text("id").primaryKey(),
  schemeCode: text("scheme_code").notNull(),
  nav: real("nav").notNull(),
  navDate: text("nav_date").notNull(), // 'YYYY-MM-DD'
  source: text("source").notNull().default("MFAPI"),
  ...timestamps,
});

// 11. Benchmark History (NIFTY 50, NIFTY Midcap 150, etc.)
export const benchmarkHistory = sqliteTable("benchmark_history", {
  id: text("id").primaryKey(),
  benchmarkCode: text("benchmark_code").notNull(), // 'NIFTY_50', 'NIFTY_MIDCAP_150', 'NIFTY_500'
  date: text("date").notNull(), // 'YYYY-MM-DD'
  value: real("value").notNull(),
  change: real("change").default(0),
  changePercent: real("change_percent").default(0),
  source: text("source").notNull().default("NSE"),
  ...timestamps,
});

// 12. Portfolio Snapshots (Monthly permanent historical ledger)
export const portfolioSnapshots = sqliteTable("portfolio_snapshots", {
  id: text("id").primaryKey(),
  portfolioId: text("portfolio_id")
    .notNull()
    .references(() => portfolios.id, { onDelete: "cascade" }),
  snapshotDate: text("snapshot_date").notNull(), // 'YYYY-MM-DD' (e.g. 2026-10-31)
  totalInvested: real("total_invested").notNull(),
  portfolioValue: real("portfolio_value").notNull(),
  totalGain: real("total_gain").notNull(),
  monthlyContribution: real("monthly_contribution").notNull().default(0),
  monthlyReturn: real("monthly_return").notNull().default(0), // return %
  ...timestamps,
});

// 13. Portfolio Snapshot Items (Asset-level historical records)
export const portfolioSnapshotItems = sqliteTable("portfolio_snapshot_items", {
  id: text("id").primaryKey(),
  snapshotId: text("snapshot_id")
    .notNull()
    .references(() => portfolioSnapshots.id, { onDelete: "cascade" }),
  assetId: text("asset_id")
    .notNull()
    .references(() => assets.id, { onDelete: "cascade" }),
  units: real("units").notNull(),
  priceOrNav: real("price_or_nav").notNull(),
  value: real("value").notNull(),
  investedAmount: real("invested_amount").notNull(),
  gain: real("gain").notNull(),
  returnPercentage: real("return_percentage").notNull(),
  ...timestamps,
});

// 14. Goals Table
export const goals = sqliteTable("goals", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  portfolioId: text("portfolio_id").references(() => portfolios.id, { onDelete: "set null" }),
  name: text("name").notNull(), // e.g. "Retirement", "Home Downpayment", "Emergency Fund"
  targetAmount: real("target_amount").notNull(),
  currentAmount: real("current_amount").notNull().default(0),
  targetYear: integer("target_year"),
  targetDate: text("target_date"), // 'YYYY-MM-DD'
  monthlyContributionTarget: real("monthly_contribution_target"),
  priority: text("priority").default("HIGH"), // 'HIGH', 'MEDIUM', 'LOW'
  notes: text("notes"),
  ...timestamps,
});

// 15. Sync Logs Table
export const syncLogs = sqliteTable("sync_logs", {
  id: text("id").primaryKey(),
  status: text("status").notNull(), // 'SUCCESS', 'PARTIAL', 'FAILED'
  triggeredBy: text("triggered_by").notNull().default("USER_MANUAL"), // 'CRON', 'USER_MANUAL', 'API'
  itemsUpdated: integer("items_updated").notNull().default(0),
  errorMessage: text("error_message"),
  durationMs: integer("duration_ms").default(0),
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

// 16. User Preferences Table
export const userPreferences = sqliteTable("user_preferences", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  defaultCurrency: text("default_currency").notNull().default("INR"),
  dateFormat: text("date_format").notNull().default("DD/MM/YYYY"),
  theme: text("theme").notNull().default("dark"),
  emailAlerts: integer("email_alerts", { mode: "boolean" }).notNull().default(false),
  showBenchmarks: integer("show_benchmarks", { mode: "boolean" }).notNull().default(true),
  ...timestamps,
});
