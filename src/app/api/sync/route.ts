import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { assets, portfolios } from "@/db/schema";
import { eq } from "drizzle-orm";
import { marketDataService } from "@/lib/market-data";
import { snapshotEngine } from "@/lib/finance/snapshot-engine";

export async function POST(req: NextRequest) {
  // Check authorization: either user session or cron secret
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  const isCron = cronSecret && authHeader === `Bearer ${cronSecret}`;

  let portfolioId: string | null = null;
  let triggeredBy: "CRON" | "USER_MANUAL" = "USER_MANUAL";

  if (isCron) {
    triggeredBy = "CRON";
    const defaultPort = await db.query.portfolios.findFirst({
      where: eq(portfolios.isDefault, true),
    });
    portfolioId = defaultPort?.id || null;
  } else {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    portfolioId = user.portfolioId;
  }

  if (!portfolioId) {
    return NextResponse.json({ error: "No portfolio found to sync" }, { status: 400 });
  }

  try {
    // 1. Fetch all assets for this portfolio
    const assetList = await db.query.assets.findMany({
      where: eq(assets.portfolioId, portfolioId),
    });

    // 2. Refresh quotes & NAVs
    for (const a of assetList) {
      try {
        if (a.type === "MUTUAL_FUND") {
          await marketDataService.getMutualFundNav(a.symbolOrCode);
        } else if (a.type === "STOCK") {
          await marketDataService.getStockQuote(a.symbolOrCode);
        }
      } catch (err) {
        console.warn(`Failed refreshing market data for ${a.symbolOrCode}:`, err);
      }
    }

    // 3. Update snapshot
    const snapshotRes = await snapshotEngine.captureSnapshot(portfolioId, triggeredBy);

    return NextResponse.json({
      message: "Portfolio refreshed and snapshot recorded",
      triggeredBy,
      assetsRefreshed: assetList.length,
      ...snapshotRes,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Sync execution failed" }, { status: 500 });
  }
}
