import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { portfolios } from "@/db/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const list = await db.query.portfolios.findMany({
    where: eq(portfolios.userId, user.id),
  });

  return NextResponse.json(list);
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name, description } = await req.json();
  if (!name) {
    return NextResponse.json({ error: "Portfolio name is required" }, { status: 400 });
  }

  const id = crypto.randomUUID();
  await db.insert(portfolios).values({
    id,
    userId: user.id,
    name: name.trim(),
    description: description || null,
    isDefault: false,
  });

  return NextResponse.json({ id, name, description }, { status: 201 });
}
