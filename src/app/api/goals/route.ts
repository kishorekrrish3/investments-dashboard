import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { goals } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import crypto from "crypto";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const list = await db.query.goals.findMany({
    where: eq(goals.userId, user.id),
    orderBy: [desc(goals.createdAt)],
  });

  return NextResponse.json(list);
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { name, targetAmount, currentAmount = 0, targetYear, targetDate, monthlyContributionTarget, priority, notes } = body;

    if (!name || !targetAmount) {
      return NextResponse.json({ error: "Goal name and target amount are required" }, { status: 400 });
    }

    const id = crypto.randomUUID();
    await db.insert(goals).values({
      id,
      userId: user.id,
      portfolioId: user.portfolioId,
      name: name.trim(),
      targetAmount: Number(targetAmount),
      currentAmount: Number(currentAmount),
      targetYear: targetYear ? Number(targetYear) : null,
      targetDate: targetDate || null,
      monthlyContributionTarget: monthlyContributionTarget ? Number(monthlyContributionTarget) : null,
      priority: priority || "HIGH",
      notes: notes || null,
    });

    return NextResponse.json({ id, message: "Goal created" }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to create goal" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { id, ...updates } = body;
    if (!id) return NextResponse.json({ error: "Goal id required" }, { status: 400 });

    if (updates.targetAmount !== undefined) updates.targetAmount = Number(updates.targetAmount);
    if (updates.currentAmount !== undefined) updates.currentAmount = Number(updates.currentAmount);
    if (updates.monthlyContributionTarget !== undefined) updates.monthlyContributionTarget = Number(updates.monthlyContributionTarget);
    updates.updatedAt = new Date().toISOString();

    await db.update(goals).set(updates).where(eq(goals.id, id));
    return NextResponse.json({ success: true, message: "Goal updated" });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to update goal" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Goal id required" }, { status: 400 });

  await db.delete(goals).where(eq(goals.id, id));
  return NextResponse.json({ success: true, message: "Goal deleted" });
}
