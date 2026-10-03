import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { assets, stocks, mutualFunds, transactions, portfolioSnapshotItems, portfolioSnapshots } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { calculatePortfolioSummary } from "@/lib/finance/portfolio";
import { marketDataService } from "@/lib/market-data";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const asset = await db.query.assets.findFirst({
    where: eq(assets.id, id),
  });

  if (!asset) {
    return NextResponse.json({ error: "Investment not found" }, { status: 404 });
  }

  // Fetch specialized metadata
  let metadata: any = null;
  if (asset.type === "MUTUAL_FUND") {
    metadata = await db.query.mutualFunds.findFirst({
      where: eq(mutualFunds.assetId, asset.id),
    });
  } else if (asset.type === "STOCK") {
    metadata = await db.query.stocks.findFirst({
      where: eq(stocks.assetId, asset.id),
    });
  }

  // Calculate current holding metrics
  const summary = await calculatePortfolioSummary(asset.portfolioId);
  const holding = summary.holdings.find(h => h.id === asset.id) || {
    id: asset.id,
    portfolioId: asset.portfolioId,
    name: asset.name,
    type: asset.type,
    symbolOrCode: asset.symbolOrCode,
    quantity: 0,
    averageBuyPrice: 0,
    investedAmount: 0,
    currentPriceOrNav: 0,
    currentValue: 0,
    unrealizedGain: 0,
    unrealizedReturnPercent: 0,
    realizedGain: 0,
    dividendIncome: 0,
    totalGain: 0,
    totalReturnPercent: 0,
    xirr: 0,
  };

  // Fetch transaction history
  const assetTransactions = await db.query.transactions.findMany({
    where: and(
      eq(transactions.assetId, asset.id),
      eq(transactions.isDeleted, false)
    ),
    orderBy: [desc(transactions.transactionDate)],
  });

  // Fetch historical market prices/NAVs
  const { searchParams } = new URL(req.url);
  const range = searchParams.get("range") || "1y";

  const history = await marketDataService.getAssetHistory(
    asset.type as "STOCK" | "MUTUAL_FUND",
    asset.symbolOrCode,
    range
  );

  // Compute "My Portfolio Value" over time for this asset
  // We reconstruct the accumulated holdings over historical dates
  const sortedTxs = [...assetTransactions].sort((a, b) =>
    a.transactionDate.localeCompare(b.transactionDate)
  );

  const portfolioValueHistory = history.map(hp => {
    let unitsAtDate = 0;
    let investedAtDate = 0;

    for (const tx of sortedTxs) {
      if (tx.transactionDate <= hp.date) {
        if (tx.transactionType === "BUY" || tx.transactionType === "SIP") {
          unitsAtDate += tx.quantity;
          investedAtDate += tx.amount;
        } else if (tx.transactionType === "SELL" || tx.transactionType === "REDEMPTION") {
          unitsAtDate = Math.max(0, unitsAtDate - tx.quantity);
        }
      }
    }

    const valueAtDate = +(unitsAtDate * hp.priceOrNav).toFixed(2);
    return {
      date: hp.date,
      priceOrNav: hp.priceOrNav,
      unitsHeld: +unitsAtDate.toFixed(4),
      investedAmount: +investedAtDate.toFixed(2),
      investmentValue: valueAtDate,
    };
  });

  return NextResponse.json({
    asset,
    metadata,
    holding,
    transactions: assetTransactions,
    history,
    portfolioValueHistory,
  });
}
