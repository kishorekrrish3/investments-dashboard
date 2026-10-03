import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { snapshotEngine } from "@/lib/finance/snapshot-engine";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const res = await snapshotEngine.captureSnapshot(user.portfolioId, "USER_MANUAL");
    return NextResponse.json(res);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to capture snapshot" }, { status: 500 });
  }
}
