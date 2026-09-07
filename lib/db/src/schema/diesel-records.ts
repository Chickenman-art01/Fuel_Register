import { bigint, bigserial, date, numeric, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { vehiclesTable } from "./vehicles";

export const dieselRecordsTable = pgTable("diesel_records", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  date: date("date", { mode: "string" }).notNull(),
  vehicleId: bigint("vehicle_id", { mode: "number" }).notNull().references(() => vehiclesTable.id),
  openingBalance: numeric("opening_balance", { precision: 12, scale: 2, mode: "number" }).notNull(),
  reading: numeric("reading", { precision: 12, scale: 2, mode: "number" }),
  dieselIssued: numeric("diesel_issued", { precision: 12, scale: 2, mode: "number" }).notNull().default(0),
  dieselPurchased: numeric("diesel_purchased", { precision: 12, scale: 2, mode: "number" }).notNull().default(0),
  closingBalance: numeric("closing_balance", { precision: 12, scale: 2, mode: "number" }).notNull(),
  operator: text("operator").notNull(),
  issuer: text("issuer").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertDieselRecordSchema = createInsertSchema(dieselRecordsTable).omit({
  id: true,
  createdAt: true,
});

export type InsertDieselRecord = z.infer<typeof insertDieselRecordSchema>;
export type DieselRecord = typeof dieselRecordsTable.$inferSelect;