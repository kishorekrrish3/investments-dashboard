import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { transactions } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const tx = await db.query.transactions.findFirst({
    where: eq(transactions.id, id),
  });

  if (!tx || tx.isDeleted) {
    return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
  }

  return NextResponse.json(tx);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const updates: any = {};
  if (body.quantity !== undefined) updates.quantity = Number(body.quantity);
  if (body.priceOrNav !== undefined) updates.priceOrNav = Number(body.priceOrNav);
  if (body.amount !== undefined) updates.amount = Number(body.amount);
  if (body.fees !== undefined) updates.fees = Number(body.fees);
  if (body.taxes !== undefined) updates.taxes = Number(body.taxes);
  if (body.transactionDate) updates.transactionDate = body.transactionDate;
  if (body.transactionType) updates.transactionType = body.transactionType;
  if (body.notes !== undefined) updates.notes = body.notes;
  updates.updatedAt = new Date().toISOString();

  await db.update(transactions).set(updates).where(eq(transactions.id, id));
  return NextResponse.json({ success: true, message: "Transaction updated" });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  // Soft delete to protect financial auditability
  await db
    .update(transactions)
    .set({
      isDeleted: true,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(transactions.id, id));

  return NextResponse.json({ success: true, message: "Transaction deleted (soft delete)" });
}
