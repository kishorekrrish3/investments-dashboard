import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { assets, transactions } from "@/db/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const contentType = req.headers.get("content-type") || "";

    // 1. JSON Full Restore
    if (contentType.includes("application/json")) {
      const backupData = await req.json();
      if (!backupData || !backupData.transactions) {
        return NextResponse.json({ error: "Invalid backup format" }, { status: 400 });
      }

      let importedTxCount = 0;
      for (const t of backupData.transactions) {
        // Ensure asset exists
        let asset = await db.query.assets.findFirst({
          where: eq(assets.symbolOrCode, t.symbolOrCode || t.assetName || "UNKNOWN"),
        });

        if (!asset) {
          const newAssetId = crypto.randomUUID();
          await db.insert(assets).values({
            id: newAssetId,
            portfolioId: user.portfolioId,
            type: t.assetType || "MUTUAL_FUND",
            symbolOrCode: t.symbolOrCode || t.assetName || "UNKNOWN",
            name: t.assetName || t.symbolOrCode || "Imported Asset",
          });
          asset = { id: newAssetId } as any;
        }

        await db.insert(transactions).values({
          id: crypto.randomUUID(),
          portfolioId: user.portfolioId,
          assetId: asset!.id,
          transactionType: t.transactionType || "BUY",
          transactionDate: t.transactionDate,
          quantity: Number(t.quantity),
          priceOrNav: Number(t.priceOrNav),
          amount: Number(t.amount),
          fees: Number(t.fees || 0),
          taxes: Number(t.taxes || 0),
          notes: t.notes || "Restored from backup",
        });
        importedTxCount++;
      }

      return NextResponse.json({ success: true, message: `Successfully restored ${importedTxCount} transactions` });
    }

    // 2. CSV Import
    const text = await req.text();
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

    if (lines.length < 2) {
      return NextResponse.json({ error: "Empty or invalid CSV file" }, { status: 400 });
    }

    const header = lines[0].toLowerCase().split(",").map(h => h.trim());
    const dateIdx = header.indexOf("date");
    const assetIdx = header.indexOf("asset");
    const typeIdx = header.indexOf("type");
    const amountIdx = header.indexOf("amount");
    const priceIdx = header.indexOf("price");
    const unitsIdx = header.indexOf("units");

    if (dateIdx === -1 || assetIdx === -1) {
      return NextResponse.json({ error: "CSV must contain at least 'date' and 'asset' columns" }, { status: 400 });
    }

    let importedCount = 0;

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(",").map(c => c.trim().replace(/^"|"$/g, ""));
      if (cols.length < 2) continue;

      const dateStr = cols[dateIdx];
      const assetName = cols[assetIdx];
      const txType = (typeIdx !== -1 && cols[typeIdx]) ? cols[typeIdx].toUpperCase() : "BUY";
      const amountVal = (amountIdx !== -1 && cols[amountIdx]) ? parseFloat(cols[amountIdx]) : 0;
      const priceVal = (priceIdx !== -1 && cols[priceIdx]) ? parseFloat(cols[priceIdx]) : 1;
      const unitsVal = (unitsIdx !== -1 && cols[unitsIdx]) ? parseFloat(cols[unitsIdx]) : (priceVal > 0 ? +(amountVal / priceVal).toFixed(4) : 1);

      // Find or create asset
      let asset = await db.query.assets.findFirst({
        where: eq(assets.name, assetName),
      });

      if (!asset) {
        const assetId = crypto.randomUUID();
        const isStock = txType.includes("STOCK") || assetName.includes(".NS") || assetName.includes(".BO");
        await db.insert(assets).values({
          id: assetId,
          portfolioId: user.portfolioId,
          type: isStock ? "STOCK" : "MUTUAL_FUND",
          symbolOrCode: assetName,
          name: assetName,
        });
        asset = { id: assetId } as any;
      }

      await db.insert(transactions).values({
        id: crypto.randomUUID(),
        portfolioId: user.portfolioId,
        assetId: asset!.id,
        transactionType: txType,
        transactionDate: dateStr,
        quantity: unitsVal,
        priceOrNav: priceVal,
        amount: amountVal || +(unitsVal * priceVal).toFixed(2),
        fees: 0,
        taxes: 0,
        notes: "Imported via CSV",
      });

      importedCount++;
    }

    return NextResponse.json({
      success: true,
      message: `Successfully imported ${importedCount} transactions`,
      count: importedCount,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Import failed" }, { status: 500 });
  }
}
