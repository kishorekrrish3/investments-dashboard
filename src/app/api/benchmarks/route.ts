import { NextRequest, NextResponse } from "next/server";
import { marketDataService } from "@/lib/market-data";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code") || "NIFTY_50";
  const range = searchParams.get("range") || "1y";

  try {
    const [benchmark, history] = await Promise.all([
      marketDataService.getBenchmark(code),
      marketDataService.getBenchmarkHistory(code, range),
    ]);

    return NextResponse.json({ benchmark, history });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to fetch benchmark" }, { status: 500 });
  }
}
