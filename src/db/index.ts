import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

const url = process.env.TURSO_DATABASE_URL || "file:local.db";
const authToken = process.env.TURSO_AUTH_TOKEN;

export const client = createClient({
  url,
  authToken,
});

export const db = drizzle(client, { schema });

/**
 * Auto-initializes database schema if tables do not exist.
 * This guarantees zero-friction initial setup for both local SQLite and Turso.
 */
export async function initializeDatabase() {
  await client.executeMultiple(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'OWNER',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS portfolios (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL DEFAULT 'My Investments',
      is_default INTEGER NOT NULL DEFAULT 1,
      description TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS assets (
      id TEXT PRIMARY KEY,
      portfolio_id TEXT NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      symbol_or_code TEXT NOT NULL,
      name TEXT NOT NULL,
      isin TEXT,
      exchange TEXT,
      category TEXT,
      amc TEXT,
      sector TEXT,
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS stocks (
      id TEXT PRIMARY KEY,
      asset_id TEXT NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
      symbol TEXT NOT NULL,
      exchange TEXT NOT NULL DEFAULT 'NSE',
      company_name TEXT NOT NULL,
      sector TEXT,
      industry TEXT,
      isin TEXT,
      market_cap TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS mutual_funds (
      id TEXT PRIMARY KEY,
      asset_id TEXT NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
      scheme_code TEXT NOT NULL,
      scheme_name TEXT NOT NULL,
      amc TEXT,
      category TEXT,
      scheme_type TEXT,
      scheme_category TEXT,
      isin_growth TEXT,
      isin_reinv TEXT,
      plan TEXT DEFAULT 'DIRECT',
      option TEXT DEFAULT 'GROWTH',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      portfolio_id TEXT NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
      asset_id TEXT NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
      transaction_type TEXT NOT NULL,
      transaction_date TEXT NOT NULL,
      quantity REAL NOT NULL,
      price_or_nav REAL NOT NULL,
      amount REAL NOT NULL,
      fees REAL NOT NULL DEFAULT 0,
      taxes REAL NOT NULL DEFAULT 0,
      notes TEXT,
      is_deleted INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sip_plans (
      id TEXT PRIMARY KEY,
      portfolio_id TEXT NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
      asset_id TEXT NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
      monthly_amount REAL NOT NULL,
      sip_date INTEGER NOT NULL,
      frequency TEXT NOT NULL DEFAULT 'MONTHLY',
      start_date TEXT NOT NULL,
      end_date TEXT,
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sip_installments (
      id TEXT PRIMARY KEY,
      sip_plan_id TEXT NOT NULL REFERENCES sip_plans(id) ON DELETE CASCADE,
      scheduled_date TEXT NOT NULL,
      actual_date TEXT,
      amount REAL NOT NULL,
      nav REAL,
      units REAL,
      status TEXT NOT NULL DEFAULT 'SCHEDULED',
      transaction_id TEXT REFERENCES transactions(id) ON DELETE SET NULL,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS market_prices (
      id TEXT PRIMARY KEY,
      symbol TEXT NOT NULL UNIQUE,
      exchange TEXT NOT NULL DEFAULT 'NSE',
      price REAL NOT NULL,
      change REAL NOT NULL DEFAULT 0,
      change_percent REAL NOT NULL DEFAULT 0,
      volume REAL DEFAULT 0,
      data_timestamp TEXT NOT NULL,
      source TEXT NOT NULL DEFAULT 'YAHOO_NSE',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS nav_history (
      id TEXT PRIMARY KEY,
      scheme_code TEXT NOT NULL,
      nav REAL NOT NULL,
      nav_date TEXT NOT NULL,
      source TEXT NOT NULL DEFAULT 'MFAPI',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS benchmark_history (
      id TEXT PRIMARY KEY,
      benchmark_code TEXT NOT NULL,
      date TEXT NOT NULL,
      value REAL NOT NULL,
      change REAL DEFAULT 0,
      change_percent REAL DEFAULT 0,
      source TEXT NOT NULL DEFAULT 'NSE',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS portfolio_snapshots (
      id TEXT PRIMARY KEY,
      portfolio_id TEXT NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
      snapshot_date TEXT NOT NULL,
      total_invested REAL NOT NULL,
      portfolio_value REAL NOT NULL,
      total_gain REAL NOT NULL,
      monthly_contribution REAL NOT NULL DEFAULT 0,
      monthly_return REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS portfolio_snapshot_items (
      id TEXT PRIMARY KEY,
      snapshot_id TEXT NOT NULL REFERENCES portfolioSnapshots(id) ON DELETE CASCADE,
      asset_id TEXT NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
      units REAL NOT NULL,
      price_or_nav REAL NOT NULL,
      value REAL NOT NULL,
      invested_amount REAL NOT NULL,
      gain REAL NOT NULL,
      return_percentage REAL NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS goals (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      portfolio_id TEXT REFERENCES portfolios(id) ON DELETE SET NULL,
      name TEXT NOT NULL,
      target_amount REAL NOT NULL,
      current_amount REAL NOT NULL DEFAULT 0,
      target_year INTEGER,
      target_date TEXT,
      monthly_contribution_target REAL,
      priority TEXT DEFAULT 'HIGH',
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sync_logs (
      id TEXT PRIMARY KEY,
      status TEXT NOT NULL,
      triggered_by TEXT NOT NULL DEFAULT 'USER_MANUAL',
      items_updated INTEGER NOT NULL DEFAULT 0,
      error_message TEXT,
      duration_ms INTEGER DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS user_preferences (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      default_currency TEXT NOT NULL DEFAULT 'INR',
      date_format TEXT NOT NULL DEFAULT 'DD/MM/YYYY',
      theme TEXT NOT NULL DEFAULT 'dark',
      email_alerts INTEGER NOT NULL DEFAULT 0,
      show_benchmarks INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_nav_history_scheme_date ON nav_history(scheme_code, nav_date);
    CREATE INDEX IF NOT EXISTS idx_market_prices_symbol ON market_prices(symbol);
    CREATE INDEX IF NOT EXISTS idx_transactions_portfolio ON transactions(portfolio_id);
    CREATE INDEX IF NOT EXISTS idx_transactions_asset ON transactions(asset_id);
    CREATE INDEX IF NOT EXISTS idx_sip_installments_plan ON sip_installments(sip_plan_id);
    CREATE INDEX IF NOT EXISTS idx_snapshots_portfolio_date ON portfolio_snapshots(portfolio_id, snapshot_date);
  `);
}
