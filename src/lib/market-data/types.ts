export interface StockQuote {
  symbol: string;
  name: string;
  exchange: "NSE" | "BSE";
  price: number;
  change: number;
  changePercent: number;
  volume?: number;
  dayHigh?: number;
  dayLow?: number;
  previousClose?: number;
  dataTimestamp: string;
  source: string;
  isCached?: boolean;
}

export interface FundNav {
  schemeCode: string;
  schemeName: string;
  nav: number;
  navDate: string; // YYYY-MM-DD
  amc?: string;
  category?: string;
  schemeType?: string;
  isinGrowth?: string;
  isinReinv?: string;
  source: string;
  isCached?: boolean;
}

export interface HistoricalPrice {
  date: string; // YYYY-MM-DD
  priceOrNav: number;
  change?: number;
}

export interface MarketSearchResult {
  id: string;
  symbolOrCode: string;
  name: string;
  type: "MUTUAL_FUND" | "STOCK";
  exchange?: string;
  category?: string;
  amc?: string;
  currentPriceOrNav?: number;
}

export interface BenchmarkQuote {
  code: string;
  name: string;
  value: number;
  change: number;
  changePercent: number;
  date: string;
  source: string;
}

export interface IStockDataProvider {
  getQuote(symbol: string): Promise<StockQuote | null>;
  getHistory(symbol: string, range?: string): Promise<HistoricalPrice[]>;
  search(query: string): Promise<MarketSearchResult[]>;
}

export interface IMutualFundDataProvider {
  getLatestNav(schemeCode: string): Promise<FundNav | null>;
  getNavHistory(schemeCode: string): Promise<HistoricalPrice[]>;
  search(query: string): Promise<MarketSearchResult[]>;
}

export interface IBenchmarkDataProvider {
  getBenchmarkValue(code: string): Promise<BenchmarkQuote | null>;
  getBenchmarkHistory(code: string, range?: string): Promise<HistoricalPrice[]>;
}
