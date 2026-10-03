import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { portfolioSnapshots, portfolioSnapshotItems, assets } from "@/db/schema";
import { eq, desc, asc } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month"); // 'YYYY-MM'
  const range = searchParams.get("range") || "all";

  const snapshots = await db.query.portfolioSnapshots.findMany({
    where: eq(portfolioSnapshots.portfolioId, user.portfolioId),
    orderBy: [asc(portfolioSnapshots.snapshotDate)],
  });

  if (month) {
    const single = snapshots.find(s => s.snapshotDate.startsWith(month));
    if (!single) return NextResponse.json(null);

    const items = await db.query.portfolioSnapshotItems.findMany({
      where: eq(portfolioSnapshotItems.snapshotId, single.id),
    });

    const assetList = await db.query.assets.findMany({
      where: eq(assets.portfolioId, user.portfolioId),
    });
    const assetMap = new Map(assetList.map(a => [a.id, a]));

    const enrichedItems = items.map(item => ({
      ...item,
      asset: assetMap.get(item.assetId) || null,
    }));

    return NextResponse.json({
      snapshot: single,
      items: enrichedItems,
    });
  }

  // Filter by range if needed
  let filtered = snapshots;
  if (range === "1y") {
    filtered = snapshots.slice(-12);
  } else if (range === "3y") {
    filtered = snapshots.slice(-36);
  } else if (range === "5y") {
    filtered = snapshots.slice(-60);
  } else if (range === "6m") {
    filtered = snapshots.slice(-6);
  } else if (range === "3m") {
    filtered = snapshots.slice(-3);
  } else if (range === "1m") {
    filtered = snapshots.slice(-2);
  }

  return NextResponse.json(filtered);
}
