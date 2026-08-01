import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * DRAM Price data table - stores historical spot prices from TrendForce
 * Each row represents a single DRAM product's price snapshot at a specific time
 */
export const dramPrices = mysqlTable("dram_prices", {
  id: int("id").autoincrement().primaryKey(),
  /** Product item name (e.g., "DDR5 16Gb (2Gx8) 4800/5600") */
  item: varchar("item", { length: 255 }).notNull(),
  /** Daily High price */
  dailyHigh: int("daily_high").notNull(),
  /** Daily Low price */
  dailyLow: int("daily_low").notNull(),
  /** Session High price */
  sessionHigh: int("session_high").notNull(),
  /** Session Low price */
  sessionLow: int("session_low").notNull(),
  /** Session Average price */
  sessionAverage: int("session_average").notNull(),
  /** Session Change percentage (stored as integer, e.g., 7 means 0.07%) */
  sessionChange: int("session_change").notNull(),
  /** Category: DDR5, DDR4, or DDR3 */
  category: mysqlEnum("category", ["DDR5", "DDR4", "DDR3"]).notNull(),
  /** Timestamp when this price was recorded */
  recordedAt: timestamp("recorded_at").defaultNow().notNull(),
  /** Timestamp when this row was created */
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type DramPrice = typeof dramPrices.$inferSelect;
export type InsertDramPrice = typeof dramPrices.$inferInsert;