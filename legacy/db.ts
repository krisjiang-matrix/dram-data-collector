import { asc, desc, eq, max } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, dramPrices, InsertDramPrice } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getDramPricesByCategory(category: "DDR5" | "DDR4" | "DDR3") {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(dramPrices)
    .where(eq(dramPrices.category, category))
    .orderBy((t) => desc(t.recordedAt));
}

export async function getLatestDramPrices() {
  const db = await getDb();
  if (!db) return [];

  const latestResult = await db
    .select({ maxTime: max(dramPrices.recordedAt) })
    .from(dramPrices)
    .limit(1);

  const latestTime = latestResult[0]?.maxTime;
  if (!latestTime) return [];

  return await db
    .select()
    .from(dramPrices)
    .where(eq(dramPrices.recordedAt, latestTime))
    .orderBy((t) => t.item);
}

export async function getDramPriceHistory(item: string) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(dramPrices)
    .where(eq(dramPrices.item, item))
    .orderBy((t) => asc(t.recordedAt));
}

export async function insertDramPrices(prices: InsertDramPrice[]) {
  const db = await getDb();
  if (!db) return;

  if (prices.length === 0) return;

  await db.insert(dramPrices).values(prices);
}

export async function getAllDramItems() {
  const db = await getDb();
  if (!db) return [];

  const result = await db
    .selectDistinct({ item: dramPrices.item, category: dramPrices.category })
    .from(dramPrices)
    .orderBy((t) => t.item);

  return result;
}
