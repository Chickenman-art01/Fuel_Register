import { bigint, bigserial, boolean, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const vehiclesTable = pgTable(
  "vehicles",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    vehicleNo: text("vehicle_no").notNull(),
    vehicleName: text("vehicle_name").notNull(),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    vehicleNoUnique: uniqueIndex("vehicles_vehicle_no_unique").on(table.vehicleNo),
  }),
);

export const insertVehicleSchema = createInsertSchema(vehiclesTable).omit({
  id: true,
  createdAt: true,
});

export type InsertVehicle = z.infer<typeof insertVehicleSchema>;
export type Vehicle = typeof vehiclesTable.$inferSelect;