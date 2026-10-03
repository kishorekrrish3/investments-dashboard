import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { sipPlans, sipInstallments } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { sipEngine } from "@/lib/finance/sip-engine";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const plan = await db.query.sipPlans.findFirst({
    where: eq(sipPlans.id, id),
  });

  if (!plan) return NextResponse.json({ error: "SIP plan not found" }, { status: 404 });

  const installments = await db.query.sipInstallments.findMany({
    where: eq(sipInstallments.sipPlanId, id),
    orderBy: [desc(sipInstallments.scheduledDate)],
  });

  return NextResponse.json({ plan, installments });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  try {
    const body = await req.json();
    await sipEngine.updatePlan(id, body);
    return NextResponse.json({ success: true, message: "SIP plan updated" });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to update SIP plan" }, { status: 500 });
  }
}
