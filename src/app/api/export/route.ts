import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { transactions, assets, sipPlans, sipInstallments, portfolioSnapshots, goals } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const format = searchParams.get("format") || "json"; // 'json' | 'csv'

  const portfolioId = user.portfolioId;

  const [assetList, txList, plans, installments, snapshots, userGoals] = await Promise.all([
    db.query.assets.findMany({ where: eq(assets.portfolioId, portfolioId) }),
    db.query.transactions.findMany({ where: and(eq(transactions.portfolioId, portfolioId), eq(transactions.isDeleted, false)) }),
    db.query.sipPlans.findMany({ where: eq(sipPlans.portfolioId, portfolioId) }),
    db.query.sipInstallments.findMany(),
    db.query.portfolioSnapshots.findMany({ where: eq(portfolioSnapshots.portfolioId, portfolioId) }),
    db.query.goals.findMany({ where: eq(goals.userId, user.id) }),
  ]);

  const assetMap = new Map(assetList.map(a => [a.id, a]));

  if (format === "csv") {
    // Generate CSV of transactions
    const rows = [
      ["Date", "Asset Name", "Type", "Symbol/Code", "Quantity", "Price/NAV", "Amount", "Fees", "Taxes", "Notes"],
    ];

    for (const t of txList) {
      const a = assetMap.get(t.assetId);
      rows.push([
        t.transactionDate,
        `"${(a?.name || "").replace(/"/g, '""')}"`,
        t.transactionType,
        a?.symbolOrCode || "",
        String(t.quantity),
        String(t.priceOrNav),
        String(t.amount),
        String(t.fees),
        String(t.taxes),
        `"${(t.notes || "").replace(/"/g, '""')}"`,
      ]);
    }

    const csvContent = rows.map(r => r.join(",")).join("\n");
    return new NextResponse(csvContent, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="transactions_${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  }

  // Full JSON Backup
  const backup = {
    version: "1.0",
    exportDate: new Date().toISOString(),
    user: { email: user.email, name: user.name },
    portfolioId,
    assets: assetList,
    transactions: txList.map(t => {
      const a = assetMap.get(t.assetId);
      return {
        ...t,
        assetName: a?.name,
        symbolOrCode: a?.symbolOrCode,
        assetType: a?.type,
      };
    }),
    sipPlans: plans,
    sipInstallments: installments.filter(i => plans.some(p => p.id === i.sipPlanId)),
    snapshots,
    goals: userGoals,
  };

  return new NextResponse(JSON.stringify(backup, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="portfolio_backup_${new Date().toISOString().split("T")[0]}.json"`,
    },
  });
}
