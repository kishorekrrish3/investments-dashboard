import { NextRequest, NextResponse } from "next/server";
import { marketDataService } from "@/lib/market-data";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const { symbol } = await params;
  const { searchParams } = new URL(req.url);
  const range = searchParams.get("range") || "1y";

  try {
    const [quote, history] = await Promise.all([
      marketDataService.getStockQuote(symbol),
      marketDataService.getAssetHistory("STOCK", symbol, range),
    ]);

    return NextResponse.json({ quote, history });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to fetch stock data" }, { status: 500 });
  }
}
