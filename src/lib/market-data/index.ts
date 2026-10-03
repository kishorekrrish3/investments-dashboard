import { db } from "@/db";
import { marketPrices, navHistory, benchmarkHistory } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { stockDataProvider } from "./stocks/provider";
import { mutualFundDataProvider } from "./mutual-funds/provider";
import { benchmarkDataProvider } from "./benchmarks/provider";
import { StockQuote, FundNav, HistoricalPrice, MarketSearchResult, BenchmarkQuote } from "./types";
import crypto from "crypto";

// Cache TTLs in milliseconds
const STOCK_CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes
const MF_CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

export class MarketDataService {
  /**
   * Retrieves Stock Quote with Turso/SQLite cache protection
   */
  async getStockQuote(symbol: string): Promise<StockQuote> {
    const cleanSymbol = symbol.trim().toUpperCase();
    const formatted = cleanSymbol.endsWith(".NS") || cleanSymbol.endsWith(".BO") ? cleanSymbol : `${cleanSymbol}.NS`;

    // 1. Check Database Cache
    try {
      const cached = await db.query.marketPrices.findFirst({
        where: eq(marketPrices.symbol, formatted),
      });

      const now = Date.now();
      if (cached) {
        const lastUpdated = new Date(cached.updatedAt).getTime();
        const isFresh = now - lastUpdated < STOCK_CACHE_TTL_MS;

        if (isFresh) {
          return {
            symbol: cached.symbol,
            name: cached.symbol,
            exchange: cached.exchange as "NSE" | "BSE",
            price: cached.price,
            change: cached.change,
            changePercent: cached.changePercent,
            volume: cached.volume || undefined,
            dataTimestamp: cached.dataTimestamp,
            source: cached.source,
            isCached: false,
          };
        }
      }

      // 2. Fetch from External Stock Provider
      const live = await stockDataProvider.getQuote(formatted);
      if (live) {
        // Upsert into Database Cache
        if (cached) {
          await db
            .update(marketPrices)
            .set({
              price: live.price,
              change: live.change,
              changePercent: live.changePercent,
              volume: live.volume || 0,
              dataTimestamp: live.dataTimestamp,
              source: live.source,
              updatedAt: new Date().toISOString(),
            })
            .where(eq(marketPrices.symbol, formatted));
        } else {
          await db.insert(marketPrices).values({
            id: crypto.randomUUID(),
            symbol: formatted,
            exchange: live.exchange,
            price: live.price,
            change: live.change,
            changePercent: live.changePercent,
            volume: live.volume || 0,
            dataTimestamp: live.dataTimestamp,
            source: live.source,
          });
        }
        return live;
      }

      // 3. Fallback to cached record if external call failed
      if (cached) {
        return {
          symbol: cached.symbol,
          name: cached.symbol,
          exchange: cached.exchange as "NSE" | "BSE",
          price: cached.price,
          change: cached.change,
          changePercent: cached.changePercent,
          volume: cached.volume || undefined,
          dataTimestamp: cached.dataTimestamp,
          source: `${cached.source} (CACHED)`,
          isCached: true,
        };
      }
    } catch (e) {
      console.error("Cache error in getStockQuote:", e);
    }

    // Default emergency fallback
    return {
      symbol: formatted,
      name: formatted,
      exchange: "NSE",
      price: 1000.0,
      change: 0,
      changePercent: 0,
      dataTimestamp: new Date().toISOString(),
      source: "FALLBACK_EMERGENCY",
      isCached: true,
    };
  }

  /**
   * Retrieves Mutual Fund Latest NAV with Turso/SQLite cache protection
   */
  async getMutualFundNav(schemeCode: string): Promise<FundNav> {
    const code = schemeCode.trim();

    try {
      // 1. Check database cache
      const cached = await db.query.navHistory.findFirst({
        where: eq(navHistory.schemeCode, code),
        orderBy: [desc(navHistory.navDate)],
      });

      const now = Date.now();
      if (cached) {
        const lastUpdated = new Date(cached.updatedAt).getTime();
        const isFresh = now - lastUpdated < MF_CACHE_TTL_MS;

        if (isFresh) {
          return {
            schemeCode: cached.schemeCode,
            schemeName: `Scheme ${cached.schemeCode}`,
            nav: cached.nav,
            navDate: cached.navDate,
            source: cached.source,
            isCached: false,
          };
        }
      }

      // 2. Fetch from External MF Provider (MFAPI.in)
      const live = await mutualFundDataProvider.getLatestNav(code);
      if (live) {
        // Record in nav_history if not already exists for that date
        const existingForDate = await db.query.navHistory.findFirst({
          where: and(
            eq(navHistory.schemeCode, code),
            eq(navHistory.navDate, live.navDate)
          ),
        });

        if (!existingForDate) {
          await db.insert(navHistory).values({
            id: crypto.randomUUID(),
            schemeCode: code,
            nav: live.nav,
            navDate: live.navDate,
            source: "MFAPI",
          });
        }
        return live;
      }

      // 3. Fallback to cached NAV
      if (cached) {
        return {
          schemeCode: cached.schemeCode,
          schemeName: `Scheme ${cached.schemeCode}`,
          nav: cached.nav,
          navDate: cached.navDate,
          source: `${cached.source} (CACHED)`,
          isCached: true,
        };
      }
    } catch (e) {
      console.error("Cache error in getMutualFundNav:", e);
    }

    return {
      schemeCode: code,
      schemeName: `Mutual Fund ${code}`,
      nav: 50.0,
      navDate: new Date().toISOString().split("T")[0],
      source: "FALLBACK_EMERGENCY",
      isCached: true,
    };
  }

  /**
   * Search across both stocks and mutual funds
   */
  async search(query: string): Promise<MarketSearchResult[]> {
    if (!query || query.trim().length < 2) return [];

    const [stocks, mfs] = await Promise.all([
      stockDataProvider.search(query).catch(() => []),
      mutualFundDataProvider.search(query).catch(() => []),
    ]);

    return [...stocks, ...mfs];
  }

  /**
   * Historical Prices/NAV
   */
  async getAssetHistory(
    type: "STOCK" | "MUTUAL_FUND",
    symbolOrCode: string,
    range: string = "1y"
  ): Promise<HistoricalPrice[]> {
    if (type === "STOCK") {
      return stockDataProvider.getHistory(symbolOrCode, range);
    } else {
      return mutualFundDataProvider.getNavHistory(symbolOrCode);
    }
  }

  /**
   * Benchmark data
   */
  async getBenchmark(code: string = "NIFTY_50"): Promise<BenchmarkQuote | null> {
    return benchmarkDataProvider.getBenchmarkValue(code);
  }

  async getBenchmarkHistory(code: string = "NIFTY_50", range: string = "1y"): Promise<HistoricalPrice[]> {
    return benchmarkDataProvider.getBenchmarkHistory(code, range);
  }
}

export const marketDataService = new MarketDataService();
export * from "./types";
