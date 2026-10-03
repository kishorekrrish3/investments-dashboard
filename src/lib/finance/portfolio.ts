import { db } from "@/db";
import { assets, transactions, portfolios } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { calculateXIRR, CashFlow } from "./xirr";
import { marketDataService } from "../market-data";

export interface AssetHolding {
  id: string; // asset id
  portfolioId: string;
  name: string;
  type: "MUTUAL_FUND" | "STOCK" | "ETF" | "CASH";
  symbolOrCode: string;
  exchange?: string | null;
  category?: string | null;
  amc?: string | null;
  sector?: string | null;
  quantity: number;
  averageBuyPrice: number;
  investedAmount: number;
  currentPriceOrNav: number;
  currentValue: number;
  unrealizedGain: number;
  unrealizedReturnPercent: number;
  realizedGain: number;
  dividendIncome: number;
  totalGain: number;
  totalReturnPercent: number;
  xirr: number;
  lastUpdated?: string;
  isCached?: boolean;
}

export interface PortfolioSummary {
  portfolioId: string;
  name: string;
  totalInvested: number;
  currentValue: number;
  totalGain: number;
  totalReturnPercent: number;
  xirr: number;
  thisMonthInvested: number;
  thisYearInvested: number;
  assetCount: number;
  holdings: AssetHolding[];
  assetAllocation: Array<{ name: string; value: number; percentage: number }>;
  categoryAllocation: Array<{ name: string; value: number; percentage: number }>;
}

export async function calculatePortfolioSummary(portfolioId: string): Promise<PortfolioSummary> {
  const port = await db.query.portfolios.findFirst({
    where: eq(portfolios.id, portfolioId),
  });

  const portfolioName = port?.name || "My Investments";

  // Fetch all non-deleted transactions for this portfolio
  const txList = await db.query.transactions.findMany({
    where: and(
      eq(transactions.portfolioId, portfolioId),
      eq(transactions.isDeleted, false)
    ),
    orderBy: [transactions.transactionDate],
  });

  // Fetch all assets in this portfolio
  const assetList = await db.query.assets.findMany({
    where: eq(assets.portfolioId, portfolioId),
  });

  const assetMap = new Map(assetList.map(a => [a.id, a]));

  // Group transactions by asset
  const txByAsset = new Map<string, typeof txList>();
  for (const tx of txList) {
    if (!txByAsset.has(tx.assetId)) {
      txByAsset.set(tx.assetId, []);
    }
    txByAsset.get(tx.assetId)!.push(tx);
  }

  const holdings: AssetHolding[] = [];
  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const currentYearStr = `${now.getFullYear()}-`;

  let thisMonthInvested = 0;
  let thisYearInvested = 0;
  const portfolioCashFlows: CashFlow[] = [];

  for (const asset of assetList) {
    const assetTxs = txByAsset.get(asset.id) || [];

    let quantity = 0;
    let totalPurchaseCost = 0;
    let totalPurchasedUnits = 0;
    let realizedGain = 0;
    let dividendIncome = 0;
    let netInvested = 0;
    const assetCashFlows: CashFlow[] = [];

    for (const tx of assetTxs) {
      const isPurchase = tx.transactionType === "BUY" || tx.transactionType === "SIP";
      const isSale = tx.transactionType === "SELL" || tx.transactionType === "REDEMPTION";
      const isDividend = tx.transactionType === "DIVIDEND";

      if (isPurchase) {
        quantity += tx.quantity;
        totalPurchasedUnits += tx.quantity;
        totalPurchaseCost += tx.amount;
        netInvested += tx.amount;

        // Cash flow is negative (outflow)
        assetCashFlows.push({ date: tx.transactionDate, amount: -tx.amount });
        portfolioCashFlows.push({ date: tx.transactionDate, amount: -tx.amount });

        if (tx.transactionDate.startsWith(currentMonthStr)) {
          thisMonthInvested += tx.amount;
        }
        if (tx.transactionDate.startsWith(currentYearStr)) {
          thisYearInvested += tx.amount;
        }
      } else if (isSale) {
        const avgCost = totalPurchasedUnits > 0 ? totalPurchaseCost / totalPurchasedUnits : 0;
        const costBasisOfSold = tx.quantity * avgCost;
        const profit = tx.amount - costBasisOfSold;
        realizedGain += profit;

        quantity = Math.max(0, quantity - tx.quantity);
        netInvested = Math.max(0, netInvested - costBasisOfSold);

        // Cash flow is positive (inflow)
        assetCashFlows.push({ date: tx.transactionDate, amount: tx.amount });
        portfolioCashFlows.push({ date: tx.transactionDate, amount: tx.amount });
      } else if (isDividend) {
        dividendIncome += tx.amount;
        assetCashFlows.push({ date: tx.transactionDate, amount: tx.amount });
        portfolioCashFlows.push({ date: tx.transactionDate, amount: tx.amount });
      }
    }

    // Skip assets that have 0 transactions
    if (assetTxs.length === 0) continue;

    const averageBuyPrice = totalPurchasedUnits > 0 ? totalPurchaseCost / totalPurchasedUnits : 0;

    // Fetch live / cached price
    let currentPriceOrNav = averageBuyPrice;
    let isCached = false;

    if (asset.type === "MUTUAL_FUND") {
      const navData = await marketDataService.getMutualFundNav(asset.symbolOrCode);
      currentPriceOrNav = navData.nav || averageBuyPrice;
      isCached = !!navData.isCached;
    } else if (asset.type === "STOCK") {
      const quoteData = await marketDataService.getStockQuote(asset.symbolOrCode);
      currentPriceOrNav = quoteData.price || averageBuyPrice;
      isCached = !!quoteData.isCached;
    }

    const currentValue = +(quantity * currentPriceOrNav).toFixed(2);
    const unrealizedGain = +(currentValue - netInvested).toFixed(2);
    const unrealizedReturnPercent = netInvested > 0 ? +((unrealizedGain / netInvested) * 100).toFixed(2) : 0;
    const totalGain = +(unrealizedGain + realizedGain + dividendIncome).toFixed(2);
    const totalReturnPercent = netInvested > 0 ? +((totalGain / netInvested) * 100).toFixed(2) : 0;

    // Terminal cash flow for XIRR
    if (currentValue > 0) {
      const todayStr = now.toISOString().split("T")[0];
      assetCashFlows.push({ date: todayStr, amount: currentValue });
    }

    const assetXirr = calculateXIRR(assetCashFlows);

    holdings.push({
      id: asset.id,
      portfolioId: asset.portfolioId,
      name: asset.name,
      type: asset.type as any,
      symbolOrCode: asset.symbolOrCode,
      exchange: asset.exchange,
      category: asset.category || "Other",
      amc: asset.amc,
      sector: asset.sector,
      quantity: +quantity.toFixed(4),
      averageBuyPrice: +averageBuyPrice.toFixed(2),
      investedAmount: +netInvested.toFixed(2),
      currentPriceOrNav: +currentPriceOrNav.toFixed(2),
      currentValue,
      unrealizedGain,
      unrealizedReturnPercent,
      realizedGain: +realizedGain.toFixed(2),
      dividendIncome: +dividendIncome.toFixed(2),
      totalGain,
      totalReturnPercent,
      xirr: assetXirr,
      isCached,
    });
  }

  // Portfolio Totals
  const totalInvested = +holdings.reduce((sum, h) => sum + h.investedAmount, 0).toFixed(2);
  const totalCurrentValue = +holdings.reduce((sum, h) => sum + h.currentValue, 0).toFixed(2);
  const totalGain = +(totalCurrentValue - totalInvested + holdings.reduce((sum, h) => sum + h.realizedGain + h.dividendIncome, 0)).toFixed(2);
  const totalReturnPercent = totalInvested > 0 ? +((totalGain / totalInvested) * 100).toFixed(2) : 0;

  // Add terminal portfolio cash flow
  if (totalCurrentValue > 0) {
    portfolioCashFlows.push({
      date: now.toISOString().split("T")[0],
      amount: totalCurrentValue,
    });
  }

  const portfolioXirr = calculateXIRR(portfolioCashFlows);

  // Asset Allocations
  const assetTypeMap = new Map<string, number>();
  const categoryMap = new Map<string, number>();

  for (const h of holdings) {
    if (h.currentValue > 0) {
      const typeLabel = h.type === "MUTUAL_FUND" ? "Mutual Funds" : h.type === "STOCK" ? "Stocks" : h.type;
      assetTypeMap.set(typeLabel, (assetTypeMap.get(typeLabel) || 0) + h.currentValue);

      const catLabel = h.category || "Unclassified";
      categoryMap.set(catLabel, (categoryMap.get(catLabel) || 0) + h.currentValue);
    }
  }

  const assetAllocation = Array.from(assetTypeMap.entries()).map(([name, value]) => ({
    name,
    value: +value.toFixed(2),
    percentage: totalCurrentValue > 0 ? +((value / totalCurrentValue) * 100).toFixed(1) : 0,
  }));

  const categoryAllocation = Array.from(categoryMap.entries()).map(([name, value]) => ({
    name,
    value: +value.toFixed(2),
    percentage: totalCurrentValue > 0 ? +((value / totalCurrentValue) * 100).toFixed(1) : 0,
  }));

  return {
    portfolioId,
    name: portfolioName,
    totalInvested,
    currentValue: totalCurrentValue,
    totalGain,
    totalReturnPercent,
    xirr: portfolioXirr,
    thisMonthInvested: +thisMonthInvested.toFixed(2),
    thisYearInvested: +thisYearInvested.toFixed(2),
    assetCount: holdings.length,
    holdings,
    assetAllocation,
    categoryAllocation,
  };
}
