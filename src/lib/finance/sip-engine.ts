import { db } from "@/db";
import { sipPlans, sipInstallments, transactions, assets } from "@/db/schema";
import { eq, and, desc, lte } from "drizzle-orm";
import { marketDataService } from "../market-data";
import crypto from "crypto";

export interface CreateSipPlanInput {
  portfolioId: string;
  assetId: string;
  monthlyAmount: number;
  sipDate: number; // 1 - 31
  frequency?: "MONTHLY" | "QUARTERLY";
  startDate: string; // YYYY-MM-DD
  endDate?: string;
  notes?: string;
}

export class SipEngine {
  /**
   * Creates a new SIP plan and generates its upcoming installments
   */
  async createPlan(input: CreateSipPlanInput) {
    const planId = crypto.randomUUID();
    const frequency = input.frequency || "MONTHLY";

    await db.insert(sipPlans).values({
      id: planId,
      portfolioId: input.portfolioId,
      assetId: input.assetId,
      monthlyAmount: input.monthlyAmount,
      sipDate: input.sipDate,
      frequency,
      startDate: input.startDate,
      endDate: input.endDate || null,
      status: "ACTIVE",
      notes: input.notes || null,
    });

    // Generate upcoming installments for the next 12 months
    await this.generateUpcomingInstallments(planId, 12);

    return planId;
  }

  /**
   * Updates an existing SIP plan WITHOUT destroying historical installments.
   * If the monthly amount or date changes, preserves old installments and creates
   * future installments with the new parameters.
   */
  async updatePlan(planId: string, updates: Partial<CreateSipPlanInput & { status: "ACTIVE" | "PAUSED" | "STOPPED" }>) {
    const existing = await db.query.sipPlans.findFirst({
      where: eq(sipPlans.id, planId),
    });

    if (!existing) {
      throw new Error("SIP Plan not found");
    }

    const todayStr = new Date().toISOString().split("T")[0];

    // If amount or date is changing, delete only FUTURE 'SCHEDULED' installments
    // NEVER delete or overwrite 'COMPLETED', 'MISSED', or 'SKIPPED' installments!
    if (
      (updates.monthlyAmount && updates.monthlyAmount !== existing.monthlyAmount) ||
      (updates.sipDate && updates.sipDate !== existing.sipDate) ||
      (updates.status && updates.status !== existing.status)
    ) {
      // Remove future scheduled installments that haven't occurred yet
      const allInstallments = await db.query.sipInstallments.findMany({
        where: and(
          eq(sipInstallments.sipPlanId, planId),
          eq(sipInstallments.status, "SCHEDULED")
        ),
      });

      for (const inst of allInstallments) {
        if (inst.scheduledDate >= todayStr) {
          await db.delete(sipInstallments).where(eq(sipInstallments.id, inst.id));
        }
      }
    }

    await db
      .update(sipPlans)
      .set({
        ...updates,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(sipPlans.id, planId));

    // If still active, regenerate future installments
    const newStatus = updates.status || existing.status;
    if (newStatus === "ACTIVE") {
      await this.generateUpcomingInstallments(planId, 12);
    }
  }

  /**
   * Generates upcoming scheduled installments
   */
  async generateUpcomingInstallments(planId: string, monthsAhead: number = 12) {
    const plan = await db.query.sipPlans.findFirst({
      where: eq(sipPlans.id, planId),
    });

    if (!plan || plan.status !== "ACTIVE") return;

    const start = new Date(plan.startDate);
    const now = new Date();
    // Start generating from current month
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    const existingInstallments = await db.query.sipInstallments.findMany({
      where: eq(sipInstallments.sipPlanId, planId),
    });
    const existingDates = new Set(existingInstallments.map(i => i.scheduledDate));

    for (let i = 0; i < monthsAhead; i++) {
      const targetDate = new Date(currentYear, currentMonth + i, plan.sipDate);
      const scheduledDateStr = targetDate.toISOString().split("T")[0];

      // Check if within plan start & end date
      if (scheduledDateStr < plan.startDate) continue;
      if (plan.endDate && scheduledDateStr > plan.endDate) break;

      if (!existingDates.has(scheduledDateStr)) {
        await db.insert(sipInstallments).values({
          id: crypto.randomUUID(),
          sipPlanId: planId,
          scheduledDate: scheduledDateStr,
          amount: plan.monthlyAmount,
          status: "SCHEDULED",
        });
      }
    }
  }

  /**
   * Marks a scheduled installment as COMPLETED and automatically writes
   * a real transaction into the ledger with current or historical NAV!
   */
  async completeInstallment(installmentId: string, actualDate?: string, customNav?: number) {
    const inst = await db.query.sipInstallments.findFirst({
      where: eq(sipInstallments.id, installmentId),
    });

    if (!inst) throw new Error("Installment not found");

    const plan = await db.query.sipPlans.findFirst({
      where: eq(sipPlans.id, inst.sipPlanId),
    });
    if (!plan) throw new Error("Parent SIP plan not found");

    const asset = await db.query.assets.findFirst({
      where: eq(assets.id, plan.assetId),
    });
    if (!asset) throw new Error("Asset not found");

    const executionDate = actualDate || inst.scheduledDate || new Date().toISOString().split("T")[0];

    // Fetch NAV
    let nav = customNav;
    if (!nav) {
      if (asset.type === "MUTUAL_FUND") {
        const navData = await marketDataService.getMutualFundNav(asset.symbolOrCode);
        nav = navData.nav;
      } else {
        const quote = await marketDataService.getStockQuote(asset.symbolOrCode);
        nav = quote.price;
      }
    }

    if (!nav || nav <= 0) nav = 100.0; // safety fallback

    const units = +(inst.amount / nav).toFixed(4);
    const txId = crypto.randomUUID();

    // 1. Create Transaction in ledger
    await db.insert(transactions).values({
      id: txId,
      portfolioId: plan.portfolioId,
      assetId: plan.assetId,
      transactionType: "SIP",
      transactionDate: executionDate,
      quantity: units,
      priceOrNav: nav,
      amount: inst.amount,
      fees: 0,
      taxes: 0,
      notes: `Automated SIP execution for ${asset.name}`,
    });

    // 2. Mark Installment Completed
    await db
      .update(sipInstallments)
      .set({
        actualDate: executionDate,
        nav,
        units,
        status: "COMPLETED",
        transactionId: txId,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(sipInstallments.id, installmentId));

    return { txId, units, nav };
  }

  /**
   * Skips an installment
   */
  async skipInstallment(installmentId: string, notes?: string) {
    await db
      .update(sipInstallments)
      .set({
        status: "SKIPPED",
        notes: notes || "Skipped by user",
        updatedAt: new Date().toISOString(),
      })
      .where(eq(sipInstallments.id, installmentId));
  }
}

export const sipEngine = new SipEngine();
