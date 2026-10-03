import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { sipPlans, assets } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { sipEngine } from "@/lib/finance/sip-engine";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const portfolioId = searchParams.get("portfolioId") || user.portfolioId;

  const plans = await db.query.sipPlans.findMany({
    where: eq(sipPlans.portfolioId, portfolioId),
    orderBy: [desc(sipPlans.createdAt)],
  });

  const assetList = await db.query.assets.findMany({
    where: eq(assets.portfolioId, portfolioId),
  });
  const assetMap = new Map(assetList.map(a => [a.id, a]));

  const enriched = plans.map(p => ({
    ...p,
    asset: assetMap.get(p.assetId) || null,
  }));

  return NextResponse.json(enriched);
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const {
      portfolioId: inputPortId,
      assetId,
      monthlyAmount,
      sipDate,
      frequency = "MONTHLY",
      startDate,
      endDate,
      notes,
    } = body;

    const portfolioId = inputPortId || user.portfolioId;

    if (!assetId || !monthlyAmount || !sipDate || !startDate) {
      return NextResponse.json(
        { error: "assetId, monthlyAmount, sipDate, and startDate are required" },
        { status: 400 }
      );
    }

    const planId = await sipEngine.createPlan({
      portfolioId,
      assetId,
      monthlyAmount: Number(monthlyAmount),
      sipDate: Number(sipDate),
      frequency,
      startDate,
      endDate: endDate || undefined,
      notes,
    });

    return NextResponse.json({ success: true, planId }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to create SIP plan" }, { status: 500 });
  }
}
