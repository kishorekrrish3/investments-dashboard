import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { transactions, assets } from "@/db/schema";
import { eq, and, desc, gte, lte } from "drizzle-orm";
import crypto from "crypto";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const portfolioId = searchParams.get("portfolioId") || user.portfolioId;
  const assetId = searchParams.get("assetId");
  const type = searchParams.get("type");
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const limit = parseInt(searchParams.get("limit") || "100", 10);

  const conditions = [
    eq(transactions.portfolioId, portfolioId),
    eq(transactions.isDeleted, false),
  ];

  if (assetId) conditions.push(eq(transactions.assetId, assetId));
  if (type) conditions.push(eq(transactions.transactionType, type));
  if (startDate) conditions.push(gte(transactions.transactionDate, startDate));
  if (endDate) conditions.push(lte(transactions.transactionDate, endDate));

  const list = await db.query.transactions.findMany({
    where: and(...conditions),
    orderBy: [desc(transactions.transactionDate), desc(transactions.createdAt)],
    limit,
  });

  // Attach asset details
  const assetList = await db.query.assets.findMany({
    where: eq(assets.portfolioId, portfolioId),
  });
  const assetMap = new Map(assetList.map(a => [a.id, a]));

  const enriched = list.map(tx => ({
    ...tx,
    asset: assetMap.get(tx.assetId) || null,
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
      transactionType,
      transactionDate,
      quantity,
      priceOrNav,
      amount,
      fees = 0,
      taxes = 0,
      notes,
    } = body;

    const portfolioId = inputPortId || user.portfolioId;

    if (!assetId || !transactionType || !transactionDate || quantity === undefined || priceOrNav === undefined) {
      return NextResponse.json(
        { error: "assetId, transactionType, transactionDate, quantity and priceOrNav are required" },
        { status: 400 }
      );
    }

    const calculatedAmount = amount !== undefined ? Number(amount) : +(Number(quantity) * Number(priceOrNav)).toFixed(2);
    const txId = crypto.randomUUID();

    await db.insert(transactions).values({
      id: txId,
      portfolioId,
      assetId,
      transactionType,
      transactionDate,
      quantity: Number(quantity),
      priceOrNav: Number(priceOrNav),
      amount: calculatedAmount,
      fees: Number(fees),
      taxes: Number(taxes),
      notes: notes || null,
      isDeleted: false,
    });

    return NextResponse.json({ id: txId, message: "Transaction recorded successfully" }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to create transaction" }, { status: 500 });
  }
}
