import { bigserial, boolean, date, integer, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const vehiclesTable = pgTable(
  "vehicles",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    srNo: integer("sr_no"),
    vehicleCode: text("vehicle_code"),
    registrationNo: text("registration_no"),
    ownerName: text("owner_name"),
    installedLocation: text("installed_location"),
    vehicleType: text("vehicle_type"),
    chassisNo: text("chassis_no"),
    engineNo: text("engine_no"),
    gpsImeiNo: text("gps_imei_no"),
    gpsStatus: text("gps_status"),
    cameraStatus: text("camera_status"),
    maintenanceStatus: text("maintenance_status"),
    permitType: text("permit_type"),
    registrationFrom: date("registration_from"),
    registrationTill: date("registration_till"),
    registrationStatus: text("registration_status"),
    insuranceFrom: date("insurance_from"),
    insuranceTill: date("insurance_till"),
    insuranceStatus: text("insurance_status"),
    fitnessFrom: date("fitness_from"),
    fitnessTill: date("fitness_till"),
    fitnessStatus: text("fitness_status"),
    puccTill: date("pucc_till"),
    puccStatus: text("pucc_status"),
    vehicleNo: text("vehicle_no"),
    vehicleName: text("vehicle_name"),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    vehicleCodeUnique: uniqueIndex("vehicles_vehicle_code_unique").on(table.vehicleCode),
  }),
);

export const insertVehicleSchema = createInsertSchema(vehiclesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertVehicle = z.infer<typeof insertVehicleSchema>;
export type Vehicle = typeof vehiclesTable.$inferSelect;