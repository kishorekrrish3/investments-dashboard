import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { calculatePortfolioSummary } from "@/lib/finance/portfolio";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const portfolioId = searchParams.get("portfolioId") || user.portfolioId;

    const summary = await calculatePortfolioSummary(portfolioId);
    return NextResponse.json(summary);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to calculate summary" }, { status: 500 });
  }
}
