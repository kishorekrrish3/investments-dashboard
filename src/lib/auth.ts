import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { db } from "@/db";
import { users, portfolios, userPreferences } from "@/db/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";

const JWT_SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET || "default_super_secure_jwt_secret_min_32_chars_long!"
);

const SESSION_COOKIE_NAME = "investments_session";

export interface SessionPayload {
  userId: string;
  email: string;
  name: string;
  role: string;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d") // 30-day persistent session
    .sign(JWT_SECRET);
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function getSessionCookie(): Promise<string | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);
  return sessionCookie?.value || null;
}

export async function getCurrentUser(): Promise<{
  id: string;
  email: string;
  name: string;
  role: string;
  portfolioId: string;
} | null> {
  const token = await getSessionCookie();
  if (!token) {
    return null;
  }

  const payload = await verifySession(token);
  if (!payload || !payload.userId) {
    return null;
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, payload.userId),
  });

  if (!user) {
    return null;
  }

  // Get default portfolio
  let portfolio = await db.query.portfolios.findFirst({
    where: eq(portfolios.userId, user.id),
  });

  if (!portfolio) {
    const newPortId = crypto.randomUUID();
    await db.insert(portfolios).values({
      id: newPortId,
      userId: user.id,
      name: "My Investments",
      isDefault: true,
      description: "Primary investment portfolio",
    });
    portfolio = { id: newPortId, userId: user.id, name: "My Investments", isDefault: true, description: "Primary investment portfolio", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    portfolioId: portfolio.id,
  };
}

export async function setSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

/**
 * Ensures at least one owner account exists in PERSONAL_MODE.
 * If PERSONAL_MODE is true and no user exists, creates a default admin account.
 */
export async function ensureDefaultPersonalUser() {
  const userCount = await db.select().from(users).limit(1);
  if (userCount.length === 0) {
    const defaultEmail = process.env.DEFAULT_USER_EMAIL || "owner@investments.local";
    const defaultPassword = process.env.DEFAULT_USER_PASSWORD || "investor123";
    const passwordHash = await hashPassword(defaultPassword);
    const userId = crypto.randomUUID();
    const portId = crypto.randomUUID();
    const prefId = crypto.randomUUID();

    await db.insert(users).values({
      id: userId,
      email: defaultEmail,
      passwordHash,
      name: "Portfolio Owner",
      role: "OWNER",
    });

    await db.insert(portfolios).values({
      id: portId,
      userId,
      name: "My Investments",
      isDefault: true,
      description: "Primary Indian Equities & Mutual Funds Portfolio",
    });

    await db.insert(userPreferences).values({
      id: prefId,
      userId,
      defaultCurrency: "INR",
      dateFormat: "DD/MM/YYYY",
      theme: "dark",
      showBenchmarks: true,
    });

    return { created: true, email: defaultEmail, password: defaultPassword };
  }
  return { created: false };
}
