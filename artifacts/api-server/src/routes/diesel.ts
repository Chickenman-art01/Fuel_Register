import { Router, type IRouter } from "express";
import { and, asc, desc, eq, lte } from "drizzle-orm";
import {
  db,
  dieselRecordsTable,
  vehiclesTable,
  type DieselRecord as DbDieselRecord,
} from "@workspace/db";
import {
  CreateDieselRecordBody,
  CreateDieselRecordResponse,
  DeleteDieselRecordParams,
  GetDieselSummaryQueryParams,
  GetDieselSummaryResponse,
  ListDieselRecordsQueryParams,
  ListDieselRecordsResponse,
  UpdateDieselRecordBody,
  UpdateDieselRecordParams,
  UpdateDieselRecordResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

type JoinedRecord = DbDieselRecord & { vehicleNo: string; vehicleName: string };

function calendarDate(value: Date | string): string {
  return value instanceof Date ? value.toISOString().slice(0, 10) : value;
}

function zodDate(value: unknown): unknown {
  if (typeof value !== "string") return value;
  return new Date(`${value}T00:00:00.000Z`);
}

async function selectJoinedRecords() {
  return db
    .select({
      id: dieselRecordsTable.id,
      date: dieselRecordsTable.date,
      vehicleId: dieselRecordsTable.vehicleId,
      vehicleNo: vehiclesTable.vehicleNo,
      vehicleName: vehiclesTable.vehicleName,
      openingBalance: dieselRecordsTable.openingBalance,
      reading: dieselRecordsTable.reading,
      dieselIssued: dieselRecordsTable.dieselIssued,
      dieselPurchased: dieselRecordsTable.dieselPurchased,
      closingBalance: dieselRecordsTable.closingBalance,
      operator: dieselRecordsTable.operator,
      issuer: dieselRecordsTable.issuer,
      createdAt: dieselRecordsTable.createdAt,
    })
    .from(dieselRecordsTable)
    .innerJoin(vehiclesTable, eq(dieselRecordsTable.vehicleId, vehiclesTable.id));
}

async function recalculateBalances(): Promise<void> {
  const rows = await db
    .select()
    .from(dieselRecordsTable)
    .orderBy(asc(dieselRecordsTable.date), asc(dieselRecordsTable.createdAt), asc(dieselRecordsTable.id));
  let runningBalance = 0;
  for (const row of rows) {
    const closingBalance = runningBalance + row.dieselPurchased - row.dieselIssued;
    await db
      .update(dieselRecordsTable)
      .set({ openingBalance: runningBalance, closingBalance })
      .where(eq(dieselRecordsTable.id, row.id));
    runningBalance = closingBalance;
  }
}

async function latestBalanceBefore(date: string): Promise<number> {
  const [previous] = await db
    .select({ closingBalance: dieselRecordsTable.closingBalance })
    .from(dieselRecordsTable)
    .where(lte(dieselRecordsTable.date, date))
    .orderBy(desc(dieselRecordsTable.date), desc(dieselRecordsTable.createdAt), desc(dieselRecordsTable.id))
    .limit(1);
  return previous?.closingBalance ?? 0;
}

router.get("/diesel/records", async (req, res): Promise<void> => {
  const parsed = ListDieselRecordsQueryParams.safeParse({
    ...req.query,
    date: zodDate(req.query.date),
  });
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const rows = await selectJoinedRecords();
  const date = calendarDate(parsed.data.date);
  const records = rows.filter((row) => row.date === date).sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime() || a.id - b.id,
  );
  res.json(ListDieselRecordsResponse.parse(records));
});

router.get("/diesel/summary", async (req, res): Promise<void> => {
  const parsed = GetDieselSummaryQueryParams.safeParse({
    ...req.query,
    date: zodDate(req.query.date),
  });
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const rows = await selectJoinedRecords();
  const date = calendarDate(parsed.data.date);
  const records = rows
    .filter((row) => row.date === date)
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime() || a.id - b.id);
  const openingBalance = records[0]?.openingBalance ?? (await latestBalanceBefore(date));
  const totalIssued = records.reduce((sum, record) => sum + record.dieselIssued, 0);
  const totalPurchased = records.reduce((sum, record) => sum + record.dieselPurchased, 0);
  const closingBalance = records.at(-1)?.closingBalance ?? openingBalance;

  res.json(
    GetDieselSummaryResponse.parse({
      date,
      openingBalance,
      totalIssued,
      totalPurchased,
      closingBalance,
      recordCount: records.length,
      recentRecords: records.slice(-5).reverse(),
    }),
  );
});

router.post("/diesel/records", async (req, res): Promise<void> => {
  const parsed = CreateDieselRecordBody.safeParse({
    ...req.body,
    date: zodDate(req.body?.date),
  });
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  if (parsed.data.dieselIssued > 0 && parsed.data.reading == null) {
    res.status(400).json({ error: "Reading is required for an issue entry" });
    return;
  }

  const [vehicle] = await db
    .select()
    .from(vehiclesTable)
    .where(and(eq(vehiclesTable.id, parsed.data.vehicleId), eq(vehiclesTable.active, true)));
  if (!vehicle) {
    res.status(404).json({ error: "Vehicle not found" });
    return;
  }

  const date = calendarDate(parsed.data.date);
  const openingBalance = await latestBalanceBefore(date);
  const closingBalance = openingBalance + parsed.data.dieselPurchased - parsed.data.dieselIssued;
  const [record] = await db
    .insert(dieselRecordsTable)
    .values({ ...parsed.data, date, openingBalance, closingBalance })
    .returning();

  await recalculateBalances();
  const [created] = (await selectJoinedRecords()).filter((row) => row.id === record.id);
  res.status(201).json(CreateDieselRecordResponse.parse(created));
});

router.patch("/diesel/records/:id", async (req, res): Promise<void> => {
  const params = UpdateDieselRecordParams.safeParse(req.params);
  const parsed = UpdateDieselRecordBody.safeParse({
    ...req.body,
    date: zodDate(req.body?.date),
  });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  if (parsed.data.dieselIssued > 0 && parsed.data.reading == null) {
    res.status(400).json({ error: "Reading is required for an issue entry" });
    return;
  }

  const [vehicle] = await db
    .select()
    .from(vehiclesTable)
    .where(and(eq(vehiclesTable.id, parsed.data.vehicleId), eq(vehiclesTable.active, true)));
  if (!vehicle) {
    res.status(404).json({ error: "Vehicle not found" });
    return;
  }

  const [record] = await db
    .update(dieselRecordsTable)
    .set({ ...parsed.data, date: calendarDate(parsed.data.date) })
    .where(eq(dieselRecordsTable.id, params.data.id))
    .returning();
  if (!record) {
    res.status(404).json({ error: "Diesel record not found" });
    return;
  }

  await recalculateBalances();
  const [updated] = (await selectJoinedRecords()).filter((row) => row.id === record.id);
  res.json(UpdateDieselRecordResponse.parse(updated));
});

router.delete("/diesel/records/:id", async (req, res): Promise<void> => {
  const params = DeleteDieselRecordParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [record] = await db
    .delete(dieselRecordsTable)
    .where(eq(dieselRecordsTable.id, params.data.id))
    .returning();
  if (!record) {
    res.status(404).json({ error: "Diesel record not found" });
    return;
  }
  await recalculateBalances();
  res.sendStatus(204);
});

export default router;