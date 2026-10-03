import { FundNav, HistoricalPrice, IMutualFundDataProvider, MarketSearchResult } from "../types";

/**
 * Normalizes DD-MM-YYYY to YYYY-MM-DD
 */
export function normalizeMfDate(dateStr: string): string {
  if (!dateStr) return new Date().toISOString().split("T")[0];
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    if (parts[0].length === 4) {
      // already YYYY-MM-DD
      return dateStr;
    }
    const [dd, mm, yyyy] = parts;
    return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
  }
  return dateStr;
}

export class MfApiProvider implements IMutualFundDataProvider {
  private baseUrl = process.env.MUTUAL_FUND_API_URL || "https://api.mfapi.in";

  async search(query: string): Promise<MarketSearchResult[]> {
    if (!query || query.trim().length < 2) return [];

    try {
      const trimmed = encodeURIComponent(query.trim());
      const res = await fetch(`${this.baseUrl}/mf/search?q=${trimmed}`, {
        headers: { "User-Agent": "InvestmentsDashboard/1.0" },
        next: { revalidate: 3600 },
      });

      if (!res.ok) {
        return this.getFallbackSearchResults(query);
      }

      const data = await res.json();
      if (!Array.isArray(data)) return [];

      return data.slice(0, 20).map((item: any) => ({
        id: `mf-${item.schemeCode}`,
        symbolOrCode: String(item.schemeCode),
        name: item.schemeName,
        type: "MUTUAL_FUND",
        exchange: "AMFI",
      }));
    } catch (err) {
      console.warn("MFAPI search error, falling back:", err);
      return this.getFallbackSearchResults(query);
    }
  }

  async getLatestNav(schemeCode: string): Promise<FundNav | null> {
    try {
      const res = await fetch(`${this.baseUrl}/mf/${schemeCode}`, {
        headers: { "User-Agent": "InvestmentsDashboard/1.0" },
        next: { revalidate: 1800 },
      });

      if (!res.ok) return null;

      const json = await res.json();
      if (!json || !json.meta || !json.data || json.data.length === 0) {
        return null;
      }

      const latest = json.data[0];
      const navVal = parseFloat(latest.nav);
      const navDate = normalizeMfDate(latest.date);

      return {
        schemeCode: String(json.meta.scheme_code),
        schemeName: json.meta.scheme_name,
        nav: isNaN(navVal) ? 0 : navVal,
        navDate,
        amc: json.meta.fund_house,
        category: json.meta.scheme_category,
        schemeType: json.meta.scheme_type,
        isinGrowth: json.meta.isin_growth,
        isinReinv: json.meta.isin_div_reinvestment,
        source: "MFAPI",
      };
    } catch (err) {
      console.warn(`MFAPI getLatestNav failed for ${schemeCode}:`, err);
      return null;
    }
  }

  async getNavHistory(schemeCode: string): Promise<HistoricalPrice[]> {
    try {
      const res = await fetch(`${this.baseUrl}/mf/${schemeCode}`, {
        headers: { "User-Agent": "InvestmentsDashboard/1.0" },
        next: { revalidate: 86400 },
      });

      if (!res.ok) return [];

      const json = await res.json();
      if (!json || !json.data || !Array.isArray(json.data)) {
        return [];
      }

      // MFAPI returns newest first; reverse to chronological order (oldest first)
      const history: HistoricalPrice[] = [];
      for (let i = json.data.length - 1; i >= 0; i--) {
        const item = json.data[i];
        const val = parseFloat(item.nav);
        if (!isNaN(val)) {
          history.push({
            date: normalizeMfDate(item.date),
            priceOrNav: val,
          });
        }
      }

      return history;
    } catch (err) {
      console.warn(`MFAPI getNavHistory failed for ${schemeCode}:`, err);
      return [];
    }
  }

  private getFallbackSearchResults(query: string): MarketSearchResult[] {
    const popular: MarketSearchResult[] = [
      { id: "mf-120503", symbolOrCode: "120503", name: "HDFC Flexi Cap Fund - Direct Plan - Growth", type: "MUTUAL_FUND", amc: "HDFC Mutual Fund", category: "Flexi Cap" },
      { id: "mf-118989", symbolOrCode: "118989", name: "Parag Parikh Flexi Cap Fund - Direct Plan - Growth", type: "MUTUAL_FUND", amc: "PPFAS Mutual Fund", category: "Flexi Cap" },
      { id: "mf-120716", symbolOrCode: "120716", name: "UTI Nifty 50 Index Fund - Direct Plan - Growth", type: "MUTUAL_FUND", amc: "UTI Mutual Fund", category: "Index Fund" },
      { id: "mf-119598", symbolOrCode: "119598", name: "Mirae Asset Large & Midcap Fund - Direct Plan - Growth", type: "MUTUAL_FUND", amc: "Mirae Asset Mutual Fund", category: "Large & Mid Cap" },
      { id: "mf-125354", symbolOrCode: "125354", name: "Quant Small Cap Fund - Direct Plan - Growth", type: "MUTUAL_FUND", amc: "Quant Mutual Fund", category: "Small Cap" },
      { id: "mf-120505", symbolOrCode: "120505", name: "HDFC Mid-Cap Opportunities Fund - Direct Plan - Growth", type: "MUTUAL_FUND", amc: "HDFC Mutual Fund", category: "Mid Cap" },
      { id: "mf-118550", symbolOrCode: "118550", name: "SBI Bluechip Fund - Direct Plan - Growth", type: "MUTUAL_FUND", amc: "SBI Mutual Fund", category: "Large Cap" },
    ];

    const q = query.toLowerCase();
    return popular.filter(p => p.name.toLowerCase().includes(q) || (p.amc && p.amc.toLowerCase().includes(q)));
  }
}

export const mutualFundDataProvider = new MfApiProvider();
