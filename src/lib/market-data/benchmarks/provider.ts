import { BenchmarkQuote, HistoricalPrice, IBenchmarkDataProvider } from "../types";

export class IndianBenchmarkDataProvider implements IBenchmarkDataProvider {
  private baseUrl = process.env.STOCK_API_URL || "https://query1.finance.yahoo.com";

  private symbolMap: Record<string, { symbol: string; name: string; fallbackVal: number }> = {
    NIFTY_50: { symbol: "^NSEI", name: "NIFTY 50", fallbackVal: 25150.0 },
    NIFTY_MIDCAP_150: { symbol: "^CRSLDX", name: "NIFTY Midcap 150", fallbackVal: 19800.0 },
    NIFTY_500: { symbol: "^CRSLDX", name: "NIFTY 500", fallbackVal: 23600.0 },
    SENSEX: { symbol: "^BSESN", name: "BSE SENSEX", fallbackVal: 82400.0 },
  };

  async getBenchmarkValue(code: string): Promise<BenchmarkQuote | null> {
    const config = this.symbolMap[code] || {
      symbol: "^NSEI",
      name: code,
      fallbackVal: 25000.0,
    };

    try {
      const url = `${this.baseUrl}/v8/finance/chart/${encodeURIComponent(config.symbol)}?range=1d&interval=1d`;
      const res = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0" },
        next: { revalidate: 300 },
      });

      if (!res.ok) {
        return this.getFallbackQuote(code, config);
      }

      const data = await res.json();
      const meta = data?.chart?.result?.[0]?.meta;
      if (!meta) return this.getFallbackQuote(code, config);

      const price = meta.regularMarketPrice || meta.chartPreviousClose || config.fallbackVal;
      const prevClose = meta.chartPreviousClose || price;
      const change = +(price - prevClose).toFixed(2);
      const changePercent = prevClose ? +((change / prevClose) * 100).toFixed(2) : 0;

      return {
        code,
        name: config.name,
        value: price,
        change,
        changePercent,
        date: new Date(meta.regularMarketTime * 1000 || Date.now()).toISOString().split("T")[0],
        source: "NSE",
      };
    } catch {
      return this.getFallbackQuote(code, config);
    }
  }

  async getBenchmarkHistory(code: string, range: string = "1y"): Promise<HistoricalPrice[]> {
    const config = this.symbolMap[code] || { symbol: "^NSEI", name: code, fallbackVal: 25000 };
    try {
      let yahooRange = "1y";
      if (range === "1m") yahooRange = "1mo";
      else if (range === "3m") yahooRange = "3mo";
      else if (range === "6m") yahooRange = "6mo";
      else if (range === "3y" || range === "5y") yahooRange = "5y";
      else if (range === "all") yahooRange = "max";

      const url = `${this.baseUrl}/v8/finance/chart/${encodeURIComponent(config.symbol)}?range=${yahooRange}&interval=1d`;
      const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
      if (!res.ok) return [];

      const data = await res.json();
      const result = data?.chart?.result?.[0];
      if (!result) return [];

      const timestamps = result.timestamp || [];
      const closes = result.indicators?.quote?.[0]?.close || [];

      const history: HistoricalPrice[] = [];
      for (let i = 0; i < timestamps.length; i++) {
        const val = closes[i];
        if (val !== null && val !== undefined && !isNaN(val)) {
          history.push({
            date: new Date(timestamps[i] * 1000).toISOString().split("T")[0],
            priceOrNav: +val.toFixed(2),
          });
        }
      }
      return history;
    } catch {
      return [];
    }
  }

  private getFallbackQuote(code: string, config: { name: string; fallbackVal: number }): BenchmarkQuote {
    return {
      code,
      name: config.name,
      value: config.fallbackVal,
      change: 0,
      changePercent: 0,
      date: new Date().toISOString().split("T")[0],
      source: "FALLBACK_CACHE",
    };
  }
}

export const benchmarkDataProvider = new IndianBenchmarkDataProvider();
