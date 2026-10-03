import { NextResponse } from "next/server";
import { getCurrentUser, ensureDefaultPersonalUser } from "@/lib/auth";

export async function GET() {
  await ensureDefaultPersonalUser();
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
  }

  return NextResponse.json({
    authenticated: true,
    user,
  });
}
