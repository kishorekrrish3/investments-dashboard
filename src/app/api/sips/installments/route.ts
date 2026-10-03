import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { sipInstallments, sipPlans, assets } from "@/db/schema";
import { eq, and, desc, asc } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const month = searchParams.get("month"); // 'YYYY-MM'

  const userPlans = await db.query.sipPlans.findMany({
    where: eq(sipPlans.portfolioId, user.portfolioId),
  });

  if (userPlans.length === 0) return NextResponse.json([]);

  const planIds = new Set(userPlans.map(p => p.id));
  const planMap = new Map(userPlans.map(p => [p.id, p]));

  const assetList = await db.query.assets.findMany({
    where: eq(assets.portfolioId, user.portfolioId),
  });
  const assetMap = new Map(assetList.map(a => [a.id, a]));

  const allInstallments = await db.query.sipInstallments.findMany({
    orderBy: [asc(sipInstallments.scheduledDate)],
  });

  const filtered = allInstallments
    .filter(i => planIds.has(i.sipPlanId))
    .filter(i => (!status ? true : i.status === status))
    .filter(i => (!month ? true : i.scheduledDate.startsWith(month)))
    .map(i => {
      const plan = planMap.get(i.sipPlanId);
      const asset = plan ? assetMap.get(plan.assetId) : null;
      return {
        ...i,
        plan,
        asset,
      };
    });

  return NextResponse.json(filtered);
}
