import { NextRequest, NextResponse } from "next/server";
import { marketDataService } from "@/lib/market-data";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ schemeCode: string }> }
) {
  const { schemeCode } = await params;
  try {
    const [nav, history] = await Promise.all([
      marketDataService.getMutualFundNav(schemeCode),
      marketDataService.getAssetHistory("MUTUAL_FUND", schemeCode),
    ]);

    return NextResponse.json({ nav, history });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to fetch mutual fund data" }, { status: 500 });
  }
}
