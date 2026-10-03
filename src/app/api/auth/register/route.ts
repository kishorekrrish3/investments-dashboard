import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, portfolios, userPreferences } from "@/db/schema";
import { hashPassword, createSession, setSessionCookie } from "@/lib/auth";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, password } = body;

    if (!name || !email || !password) {
      return NextResponse.json({ error: "Name, email and password are required" }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }

    // In PERSONAL_MODE, if a user already exists, prevent unauthorized registrations
    const existingUsers = await db.select().from(users);
    if (process.env.PERSONAL_MODE === "true" && existingUsers.length > 0) {
      return NextResponse.json(
        { error: "Personal Mode is enabled. New registrations are disabled." },
        { status: 403 }
      );
    }

    const passwordHash = await hashPassword(password);
    const userId = crypto.randomUUID();
    const portfolioId = crypto.randomUUID();
    const prefId = crypto.randomUUID();

    await db.insert(users).values({
      id: userId,
      email: email.trim().toLowerCase(),
      name: name.trim(),
      passwordHash,
      role: "OWNER",
    });

    await db.insert(portfolios).values({
      id: portfolioId,
      userId,
      name: "My Investments",
      isDefault: true,
      description: "Primary investment portfolio",
    });

    await db.insert(userPreferences).values({
      id: prefId,
      userId,
      defaultCurrency: "INR",
      dateFormat: "DD/MM/YYYY",
      theme: "dark",
      showBenchmarks: true,
    });

    const token = await createSession({
      userId,
      email: email.trim().toLowerCase(),
      name: name.trim(),
      role: "OWNER",
    });

    await setSessionCookie(token);

    return NextResponse.json({
      success: true,
      user: { id: userId, email, name, role: "OWNER" },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Registration failed" }, { status: 500 });
  }
}
