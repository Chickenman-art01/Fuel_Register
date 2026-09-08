import { Router, type IRouter } from "express";
import { asc, eq } from "drizzle-orm";
import { db, vehiclesTable } from "@workspace/db";
import {
  CreateVehicleBody,
  CreateVehicleResponse,
  DeleteVehicleParams,
  ListVehiclesResponse,
  UpdateVehicleBody,
  UpdateVehicleParams,
  UpdateVehicleResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/vehicles", async (_req, res): Promise<void> => {
  const vehicles = await db
    .select()
    .from(vehiclesTable)
    .where(eq(vehiclesTable.active, true))
    .orderBy(asc(vehiclesTable.srNo), asc(vehiclesTable.vehicleCode), asc(vehiclesTable.vehicleNo));
  res.json(ListVehiclesResponse.parse(vehicles));
});

router.post("/vehicles", async (req, res): Promise<void> => {
  const parsed = CreateVehicleBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const payload = {
    ...parsed.data,
    vehicleNo: parsed.data.vehicleNo || parsed.data.registrationNo || parsed.data.vehicleCode || "UNNAMED",
    vehicleName: parsed.data.vehicleName || (parsed.data.ownerName ? `${parsed.data.vehicleType || 'Vehicle'} (${parsed.data.ownerName})` : parsed.data.vehicleType || parsed.data.vehicleCode || "Vehicle"),
  };

  try {
    const [vehicle] = await db.insert(vehiclesTable).values(payload).returning();
    res.status(201).json(CreateVehicleResponse.parse(vehicle));
  } catch (error) {
    req.log.warn({ error }, "Unable to create vehicle");
    res.status(409).json({ error: "Vehicle code or registration already exists" });
  }
});

router.patch("/vehicles/:id", async (req, res): Promise<void> => {
  const params = UpdateVehicleParams.safeParse(req.params);
  const parsed = UpdateVehicleBody.safeParse(req.body);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updateData = { ...parsed.data };
  if (!updateData.vehicleNo && (updateData.registrationNo || updateData.vehicleCode)) {
    updateData.vehicleNo = updateData.registrationNo || updateData.vehicleCode;
  }
  if (!updateData.vehicleName && (updateData.vehicleType || updateData.ownerName || updateData.vehicleCode)) {
    updateData.vehicleName = updateData.ownerName ? `${updateData.vehicleType || 'Vehicle'} (${updateData.ownerName})` : updateData.vehicleType || updateData.vehicleCode;
  }

  const [vehicle] = await db
    .update(vehiclesTable)
    .set({ ...updateData, updatedAt: new Date() })
    .where(eq(vehiclesTable.id, params.data.id))
    .returning();

  if (!vehicle) {
    res.status(404).json({ error: "Vehicle not found" });
    return;
  }
  res.json(UpdateVehicleResponse.parse(vehicle));
});

router.delete("/vehicles/:id", async (req, res): Promise<void> => {
  const params = DeleteVehicleParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [vehicle] = await db
    .update(vehiclesTable)
    .set({ active: false })
    .where(eq(vehiclesTable.id, params.data.id))
    .returning();

  if (!vehicle) {
    res.status(404).json({ error: "Vehicle not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;