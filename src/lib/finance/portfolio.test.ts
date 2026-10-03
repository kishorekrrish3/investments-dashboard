import { describe, it, expect, beforeEach } from "vitest";
import { db, initializeDatabase } from "@/db";
import { users, portfolios, assets, transactions, sipPlans, sipInstallments, portfolioSnapshots } from "@/db/schema";
import { calculatePortfolioSummary } from "./portfolio";
import { sipEngine } from "./sip-engine";
import { snapshotEngine } from "./snapshot-engine";
import { eq } from "drizzle-orm";
import crypto from "crypto";

describe("Portfolio & SIP Engines", () => {
  const testUserId = "test-user-1";
  const testPortfolioId = "test-port-1";
  const testAssetId = "test-asset-1";

  beforeEach(async () => {
    await initializeDatabase();
    // Clean up test tables
    await db.delete(transactions);
    await db.delete(sipInstallments);
    await db.delete(sipPlans);
    await db.delete(assets);
    await db.delete(portfolioSnapshots);
    await db.delete(portfolios);
    await db.delete(users);

    // Setup base user & portfolio
    await db.insert(users).values({
      id: testUserId,
      email: "test@investments.local",
      passwordHash: "hash123",
      name: "Test Investor",
      role: "OWNER",
    });

    await db.insert(portfolios).values({
      id: testPortfolioId,
      userId: testUserId,
      name: "Test Portfolio",
      isDefault: true,
    });

    await db.insert(assets).values({
      id: testAssetId,
      portfolioId: testPortfolioId,
      type: "MUTUAL_FUND",
      symbolOrCode: "120503",
      name: "HDFC Flexi Cap Fund",
      category: "Flexi Cap",
      amc: "HDFC Mutual Fund",
    });
  });

  it("should calculate portfolio metrics correctly with multiple buy transactions", async () => {
    // Add two buy transactions
    await db.insert(transactions).values([
      {
        id: crypto.randomUUID(),
        portfolioId: testPortfolioId,
        assetId: testAssetId,
        transactionType: "BUY",
        transactionDate: "2026-01-10",
        quantity: 100,
        priceOrNav: 50.0,
        amount: 5000.0,
      },
      {
        id: crypto.randomUUID(),
        portfolioId: testPortfolioId,
        assetId: testAssetId,
        transactionType: "BUY",
        transactionDate: "2026-02-10",
        quantity: 100,
        priceOrNav: 60.0,
        amount: 6000.0,
      },
    ]);

    const summary = await calculatePortfolioSummary(testPortfolioId);

    expect(summary.totalInvested).toBe(11000.0);
    expect(summary.holdings.length).toBe(1);
    expect(summary.holdings[0].quantity).toBe(200);
    expect(summary.holdings[0].averageBuyPrice).toBe(55.0);
    expect(summary.currentValue).toBeGreaterThan(0);
  });

  it("should preserve historical installments when SIP parameters change", async () => {
    const planId = await sipEngine.createPlan({
      portfolioId: testPortfolioId,
      assetId: testAssetId,
      monthlyAmount: 2500,
      sipDate: 5,
      frequency: "MONTHLY",
      startDate: "2026-01-01",
    });

    // Verify upcoming installments were created
    const initialInstallments = await db.query.sipInstallments.findMany({
      where: eq(sipInstallments.sipPlanId, planId),
    });
    expect(initialInstallments.length).toBeGreaterThan(0);

    // Complete the first installment
    const firstId = initialInstallments[0].id;
    await sipEngine.completeInstallment(firstId, "2026-01-05", 50.0);

    const completed = await db.query.sipInstallments.findFirst({
      where: eq(sipInstallments.id, firstId),
    });
    expect(completed?.status).toBe("COMPLETED");
    expect(completed?.amount).toBe(2500);

    // Update plan with new amount (e.g. ₹3,000)
    await sipEngine.updatePlan(planId, {
      monthlyAmount: 3000,
    });

    // Historical completed installment MUST remain ₹2,500
    const preserved = await db.query.sipInstallments.findFirst({
      where: eq(sipInstallments.id, firstId),
    });
    expect(preserved?.amount).toBe(2500);
    expect(preserved?.status).toBe("COMPLETED");
  });

  it("should capture and persist monthly snapshot without duplicates", async () => {
    await db.insert(transactions).values({
      id: crypto.randomUUID(),
      portfolioId: testPortfolioId,
      assetId: testAssetId,
      transactionType: "BUY",
      transactionDate: "2026-03-01",
      quantity: 50,
      priceOrNav: 100.0,
      amount: 5000.0,
    });

    // Capture snapshot
    const res1 = await snapshotEngine.captureSnapshot(testPortfolioId, "USER_MANUAL");
    expect(res1.success).toBe(true);

    const snapshots = await db.query.portfolioSnapshots.findMany({
      where: eq(portfolioSnapshots.portfolioId, testPortfolioId),
    });
    expect(snapshots.length).toBe(1);

    // Repeat capture for same month - should update in place, not duplicate
    const res2 = await snapshotEngine.captureSnapshot(testPortfolioId, "USER_MANUAL");
    expect(res2.success).toBe(true);

    const snapshotsAfter = await db.query.portfolioSnapshots.findMany({
      where: eq(portfolioSnapshots.portfolioId, testPortfolioId),
    });
    expect(snapshotsAfter.length).toBe(1);
  });
});
