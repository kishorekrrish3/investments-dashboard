import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { calculatePortfolioSummary } from "@/lib/finance/portfolio";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type"); // 'STOCK' | 'MUTUAL_FUND'

  const summary = await calculatePortfolioSummary(user.portfolioId);
  let holdings = summary.holdings;

  if (type) {
    holdings = holdings.filter(h => h.type === type);
  }

  return NextResponse.json(holdings);
}
