import { db } from "@/db";
import { portfolioSnapshots, portfolioSnapshotItems, syncLogs, portfolios } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { calculatePortfolioSummary } from "./portfolio";
import crypto from "crypto";

export class SnapshotEngine {
  /**
   * Generates and persists a portfolio snapshot for the current date or end of month.
   */
  async captureSnapshot(portfolioId: string, triggeredBy: "CRON" | "USER_MANUAL" | "API" = "USER_MANUAL") {
    const startTime = Date.now();
    try {
      const summary = await calculatePortfolioSummary(portfolioId);
      const todayStr = new Date().toISOString().split("T")[0];

      // Format snapshot date as last day of month or today
      const dateObj = new Date();
      const year = dateObj.getFullYear();
      const month = dateObj.getMonth();
      const lastDay = new Date(year, month + 1, 0).getDate();
      const endOfMonthStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

      // Check if snapshot already exists for this month
      const existing = await db.query.portfolioSnapshots.findFirst({
        where: and(
          eq(portfolioSnapshots.portfolioId, portfolioId),
          eq(portfolioSnapshots.snapshotDate, endOfMonthStr)
        ),
      });

      // Find previous month's snapshot to compute monthly return
      const prevSnapshot = await db.query.portfolioSnapshots.findFirst({
        where: eq(portfolioSnapshots.portfolioId, portfolioId),
        orderBy: [desc(portfolioSnapshots.snapshotDate)],
      });

      let monthlyReturn = 0;
      if (prevSnapshot && prevSnapshot.snapshotDate !== endOfMonthStr) {
        const openingVal = prevSnapshot.portfolioValue;
        const netContribution = summary.thisMonthInvested;
        const base = openingVal + netContribution;
        if (base > 0) {
          monthlyReturn = +(((summary.currentValue - base) / base) * 100).toFixed(2);
        }
      } else if (summary.totalInvested > 0) {
        monthlyReturn = summary.totalReturnPercent;
      }

      let snapshotId = existing?.id;

      if (existing) {
        await db
          .update(portfolioSnapshots)
          .set({
            totalInvested: summary.totalInvested,
            portfolioValue: summary.currentValue,
            totalGain: summary.totalGain,
            monthlyContribution: summary.thisMonthInvested,
            monthlyReturn,
            updatedAt: new Date().toISOString(),
          })
          .where(eq(portfolioSnapshots.id, existing.id));

        // Delete old items for clean refresh
        await db.delete(portfolioSnapshotItems).where(eq(portfolioSnapshotItems.snapshotId, existing.id));
      } else {
        snapshotId = crypto.randomUUID();
        await db.insert(portfolioSnapshots).values({
          id: snapshotId,
          portfolioId,
          snapshotDate: endOfMonthStr,
          totalInvested: summary.totalInvested,
          portfolioValue: summary.currentValue,
          totalGain: summary.totalGain,
          monthlyContribution: summary.thisMonthInvested,
          monthlyReturn,
        });
      }

      // Insert snapshot items
      for (const h of summary.holdings) {
        await db.insert(portfolioSnapshotItems).values({
          id: crypto.randomUUID(),
          snapshotId: snapshotId!,
          assetId: h.id,
          units: h.quantity,
          priceOrNav: h.currentPriceOrNav,
          value: h.currentValue,
          investedAmount: h.investedAmount,
          gain: h.totalGain,
          returnPercentage: h.totalReturnPercent,
        });
      }

      // Record Sync Log
      const durationMs = Date.now() - startTime;
      await db.insert(syncLogs).values({
        id: crypto.randomUUID(),
        status: "SUCCESS",
        triggeredBy,
        itemsUpdated: summary.holdings.length,
        durationMs,
      });

      return {
        success: true,
        snapshotId,
        portfolioValue: summary.currentValue,
        totalInvested: summary.totalInvested,
        totalGain: summary.totalGain,
        itemsCount: summary.holdings.length,
      };
    } catch (err: any) {
      const durationMs = Date.now() - startTime;
      await db.insert(syncLogs).values({
        id: crypto.randomUUID(),
        status: "FAILED",
        triggeredBy,
        itemsUpdated: 0,
        errorMessage: err?.message || "Snapshot sync failed",
        durationMs,
      });
      throw err;
    }
  }

  /**
   * Backfills or generates mock historical monthly snapshots if starting a new portfolio,
   * or retrieves historical snapshots for the Portfolio Growth Chart.
   */
  async getHistoricalSnapshots(portfolioId: string, range: string = "all") {
    const list = await db.query.portfolioSnapshots.findMany({
      where: eq(portfolioSnapshots.portfolioId, portfolioId),
      orderBy: [portfolioSnapshots.snapshotDate],
    });

    return list;
  }
}

export const snapshotEngine = new SnapshotEngine();
