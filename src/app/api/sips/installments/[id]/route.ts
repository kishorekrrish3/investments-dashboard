import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { sipEngine } from "@/lib/finance/sip-engine";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { action, actualDate, customNav, notes } = body;

  try {
    if (action === "COMPLETE") {
      const res = await sipEngine.completeInstallment(id, actualDate, customNav);
      return NextResponse.json({ success: true, message: "Installment marked as completed and transaction logged", ...res });
    } else if (action === "SKIP") {
      await sipEngine.skipInstallment(id, notes);
      return NextResponse.json({ success: true, message: "Installment skipped" });
    } else {
      return NextResponse.json({ error: "Invalid action. Use COMPLETE or SKIP" }, { status: 400 });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Installment action failed" }, { status: 500 });
  }
}
