import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { assets, stocks, mutualFunds } from "@/db/schema";
import { eq } from "drizzle-orm";
import { marketDataService } from "@/lib/market-data";
import crypto from "crypto";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const portfolioId = searchParams.get("portfolioId") || user.portfolioId;

  const list = await db.query.assets.findMany({
    where: eq(assets.portfolioId, portfolioId),
  });

  return NextResponse.json(list);
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const {
      type, // 'MUTUAL_FUND' | 'STOCK'
      symbolOrCode,
      name,
      exchange,
      category,
      amc,
      sector,
      portfolioId: inputPortId,
    } = body;

    const portfolioId = inputPortId || user.portfolioId;

    if (!type || !symbolOrCode || !name) {
      return NextResponse.json({ error: "Type, symbol/code and name are required" }, { status: 400 });
    }

    const cleanSymbol = symbolOrCode.trim();

    // Check if asset already exists in this portfolio
    const existing = await db.query.assets.findFirst({
      where: eq(assets.symbolOrCode, cleanSymbol),
    });

    if (existing && existing.portfolioId === portfolioId) {
      return NextResponse.json(existing, { status: 200 });
    }

    const assetId = crypto.randomUUID();

    await db.insert(assets).values({
      id: assetId,
      portfolioId,
      type,
      symbolOrCode: cleanSymbol,
      name: name.trim(),
      exchange: exchange || (type === "STOCK" ? "NSE" : "AMFI"),
      category: category || null,
      amc: amc || null,
      sector: sector || null,
      status: "ACTIVE",
    });

    if (type === "MUTUAL_FUND") {
      const mfNav = await marketDataService.getMutualFundNav(cleanSymbol);
      await db.insert(mutualFunds).values({
        id: crypto.randomUUID(),
        assetId,
        schemeCode: cleanSymbol,
        schemeName: name.trim(),
        amc: amc || mfNav.amc || null,
        category: category || mfNav.category || null,
        schemeType: mfNav.schemeType || "Open Ended",
        isinGrowth: mfNav.isinGrowth || null,
        isinReinv: mfNav.isinReinv || null,
      });
    } else if (type === "STOCK") {
      await db.insert(stocks).values({
        id: crypto.randomUUID(),
        assetId,
        symbol: cleanSymbol,
        exchange: exchange || "NSE",
        companyName: name.trim(),
        sector: sector || category || null,
      });
    }

    return NextResponse.json({ id: assetId, symbolOrCode: cleanSymbol, name }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to create asset" }, { status: 500 });
  }
}
