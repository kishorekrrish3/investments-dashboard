import { HistoricalPrice, IStockDataProvider, MarketSearchResult, StockQuote } from "../types";

export class IndianStockDataProvider implements IStockDataProvider {
  private baseUrl = process.env.STOCK_API_URL || "https://query1.finance.yahoo.com";

  private formatSymbol(symbol: string, exchange: string = "NSE"): string {
    const clean = symbol.trim().toUpperCase();
    if (clean.endsWith(".NS") || clean.endsWith(".BO")) {
      return clean;
    }
    return exchange === "BSE" ? `${clean}.BO` : `${clean}.NS`;
  }

  async getQuote(symbol: string): Promise<StockQuote | null> {
    try {
      const fullSymbol = this.formatSymbol(symbol);
      const url = `${this.baseUrl}/v8/finance/chart/${encodeURIComponent(fullSymbol)}?range=1d&interval=1d`;

      const res = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          Accept: "application/json",
        },
        next: { revalidate: 300 }, // 5 min cache
      });

      if (!res.ok) {
        return this.getFallbackQuote(symbol);
      }

      const data = await res.json();
      const meta = data?.chart?.result?.[0]?.meta;
      if (!meta) {
        return this.getFallbackQuote(symbol);
      }

      const price = meta.regularMarketPrice || meta.chartPreviousClose || 0;
      const prevClose = meta.chartPreviousClose || price;
      const change = +(price - prevClose).toFixed(2);
      const changePercent = prevClose ? +((change / prevClose) * 100).toFixed(2) : 0;

      return {
        symbol: fullSymbol,
        name: meta.shortName || meta.symbol || symbol,
        exchange: fullSymbol.endsWith(".BO") ? "BSE" : "NSE",
        price,
        change,
        changePercent,
        volume: meta.regularMarketVolume,
        dayHigh: meta.regularMarketDayHigh,
        dayLow: meta.regularMarketDayLow,
        previousClose: prevClose,
        dataTimestamp: new Date(meta.regularMarketTime * 1000 || Date.now()).toISOString(),
        source: "YAHOO_NSE",
      };
    } catch (err) {
      console.warn(`Stock quote failed for ${symbol}:`, err);
      return this.getFallbackQuote(symbol);
    }
  }

  async getHistory(symbol: string, range: string = "1y"): Promise<HistoricalPrice[]> {
    try {
      const fullSymbol = this.formatSymbol(symbol);
      // Valid ranges: 1mo, 3mo, 6mo, 1y, 2y, 5y, max
      let yahooRange = "1y";
      if (range === "1m") yahooRange = "1mo";
      else if (range === "3m") yahooRange = "3mo";
      else if (range === "6m") yahooRange = "6mo";
      else if (range === "1y") yahooRange = "1y";
      else if (range === "3y") yahooRange = "5y";
      else if (range === "5y") yahooRange = "5y";
      else if (range === "all") yahooRange = "max";

      const url = `${this.baseUrl}/v8/finance/chart/${encodeURIComponent(fullSymbol)}?range=${yahooRange}&interval=1d`;
      const res = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
        next: { revalidate: 3600 },
      });

      if (!res.ok) return [];

      const data = await res.json();
      const result = data?.chart?.result?.[0];
      if (!result) return [];

      const timestamps = result.timestamp || [];
      const closes = result.indicators?.quote?.[0]?.close || [];

      const history: HistoricalPrice[] = [];
      for (let i = 0; i < timestamps.length; i++) {
        const p = closes[i];
        if (p !== null && p !== undefined && !isNaN(p)) {
          const date = new Date(timestamps[i] * 1000).toISOString().split("T")[0];
          history.push({
            date,
            priceOrNav: +p.toFixed(2),
          });
        }
      }

      return history;
    } catch (err) {
      console.warn(`Stock history failed for ${symbol}:`, err);
      return [];
    }
  }

  async search(query: string): Promise<MarketSearchResult[]> {
    if (!query || query.trim().length < 2) return [];

    const q = query.trim().toUpperCase();
    const matches = INDIAN_STOCKS_DIRECTORY.filter(
      s => s.symbol.includes(q) || s.name.toUpperCase().includes(q)
    );

    return matches.slice(0, 15).map(s => ({
      id: `stock-${s.symbol}`,
      symbolOrCode: s.symbol,
      name: s.name,
      type: "STOCK",
      exchange: s.exchange,
      category: s.sector,
    }));
  }

  private getFallbackQuote(symbol: string): StockQuote | null {
    const clean = symbol.replace(/\.(NS|BO)$/i, "").toUpperCase();
    const found = INDIAN_STOCKS_DIRECTORY.find(s => s.symbol.replace(/\.(NS|BO)$/i, "") === clean);
    if (!found) return null;

    return {
      symbol: found.symbol,
      name: found.name,
      exchange: found.exchange,
      price: found.basePrice,
      change: 0,
      changePercent: 0,
      dataTimestamp: new Date().toISOString(),
      source: "FALLBACK_CACHE",
      isCached: true,
    };
  }
}

export const INDIAN_STOCKS_DIRECTORY: Array<{
  symbol: string;
  name: string;
  exchange: "NSE" | "BSE";
  sector: string;
  basePrice: number;
}> = [
  { symbol: "RELIANCE.NS", name: "Reliance Industries Ltd", exchange: "NSE", sector: "Energy & Conglomerate", basePrice: 2950.0 },
  { symbol: "TCS.NS", name: "Tata Consultancy Services Ltd", exchange: "NSE", sector: "Information Technology", basePrice: 4230.0 },
  { symbol: "HDFCBANK.NS", name: "HDFC Bank Ltd", exchange: "NSE", sector: "Banking & Financial Services", basePrice: 1680.0 },
  { symbol: "INFY.NS", name: "Infosys Ltd", exchange: "NSE", sector: "Information Technology", basePrice: 1910.0 },
  { symbol: "ICICIBANK.NS", name: "ICICI Bank Ltd", exchange: "NSE", sector: "Banking & Financial Services", basePrice: 1240.0 },
  { symbol: "TATAMOTORS.NS", name: "Tata Motors Ltd", exchange: "NSE", sector: "Automobile", basePrice: 960.0 },
  { symbol: "ITC.NS", name: "ITC Ltd", exchange: "NSE", sector: "FMCG", basePrice: 510.0 },
  { symbol: "LT.NS", name: "Larsen & Toubro Ltd", exchange: "NSE", sector: "Infrastructure", basePrice: 3620.0 },
  { symbol: "BHARTIARTL.NS", name: "Bharti Airtel Ltd", exchange: "NSE", sector: "Telecommunication", basePrice: 1690.0 },
  { symbol: "SBIN.NS", name: "State Bank of India", exchange: "NSE", sector: "Banking & Financial Services", basePrice: 790.0 },
  { symbol: "BAJFINANCE.NS", name: "Bajaj Finance Ltd", exchange: "NSE", sector: "Financial Services", basePrice: 7150.0 },
  { symbol: "HINDUNILVR.NS", name: "Hindustan Unilever Ltd", exchange: "NSE", sector: "FMCG", basePrice: 2780.0 },
  { symbol: "MARUTI.NS", name: "Maruti Suzuki India Ltd", exchange: "NSE", sector: "Automobile", basePrice: 12850.0 },
  { symbol: "TITAN.NS", name: "Titan Company Ltd", exchange: "NSE", sector: "Consumer Durables", basePrice: 3550.0 },
  { symbol: "SUNPHARMA.NS", name: "Sun Pharmaceutical Industries Ltd", exchange: "NSE", sector: "Healthcare & Pharma", basePrice: 1890.0 },
  { symbol: "WIPRO.NS", name: "Wipro Ltd", exchange: "NSE", sector: "Information Technology", basePrice: 540.0 },
  { symbol: "ASIANPAINT.NS", name: "Asian Paints Ltd", exchange: "NSE", sector: "Paints & Chemicals", basePrice: 3120.0 },
  { symbol: "KOTAKBANK.NS", name: "Kotak Mahindra Bank Ltd", exchange: "NSE", sector: "Banking & Financial Services", basePrice: 1820.0 },
  { symbol: "NTPC.NS", name: "NTPC Ltd", exchange: "NSE", sector: "Power & Utilities", basePrice: 425.0 },
  { symbol: "POWERGRID.NS", name: "Power Grid Corp of India", exchange: "NSE", sector: "Power & Utilities", basePrice: 345.0 },
];

export const stockDataProvider = new IndianStockDataProvider();
