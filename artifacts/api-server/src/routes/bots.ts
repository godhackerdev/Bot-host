import { Router, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
import { db, botsTable, botLogsTable } from "@workspace/db";
import {
  CreateBotBody,
  UpdateBotBody,
  GetBotParams,
  UpdateBotParams,
  DeleteBotParams,
  StartBotParams,
  StopBotParams,
  RestartBotParams,
  GetBotLogsParams,
  AddBotLogParams,
  AddBotLogBody,
  GetBotResponse,
  ListBotsResponse,
  GetBotLogsResponse,
  GetDashboardStatsResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/bots", async (req, res): Promise<void> => {
  const bots = await db.select().from(botsTable).orderBy(botsTable.createdAt);
  res.json(ListBotsResponse.parse(bots));
});

router.post("/bots", async (req, res): Promise<void> => {
  const parsed = CreateBotBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [bot] = await db.insert(botsTable).values(parsed.data).returning();
  res.status(201).json(GetBotResponse.parse(bot));
});

router.get("/bots/:id", async (req, res): Promise<void> => {
  const params = GetBotParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [bot] = await db.select().from(botsTable).where(eq(botsTable.id, params.data.id));
  if (!bot) {
    res.status(404).json({ error: "Bot not found" });
    return;
  }
  res.json(GetBotResponse.parse(bot));
});

router.patch("/bots/:id", async (req, res): Promise<void> => {
  const params = UpdateBotParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateBotBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [bot] = await db
    .update(botsTable)
    .set(parsed.data)
    .where(eq(botsTable.id, params.data.id))
    .returning();
  if (!bot) {
    res.status(404).json({ error: "Bot not found" });
    return;
  }
  res.json(GetBotResponse.parse(bot));
});

router.delete("/bots/:id", async (req, res): Promise<void> => {
  const params = DeleteBotParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [bot] = await db.delete(botsTable).where(eq(botsTable.id, params.data.id)).returning();
  if (!bot) {
    res.status(404).json({ error: "Bot not found" });
    return;
  }
  res.sendStatus(204);
});

router.post("/bots/:id/start", async (req, res): Promise<void> => {
  const params = StartBotParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [bot] = await db
    .update(botsTable)
    .set({ status: "running", updatedAt: new Date() })
    .where(eq(botsTable.id, params.data.id))
    .returning();
  if (!bot) {
    res.status(404).json({ error: "Bot not found" });
    return;
  }
  await db.insert(botLogsTable).values({
    botId: bot.id,
    level: "info",
    message: `Bot "${bot.name}" started successfully`,
  });
  res.json(GetBotResponse.parse(bot));
});

router.post("/bots/:id/stop", async (req, res): Promise<void> => {
  const params = StopBotParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [bot] = await db
    .update(botsTable)
    .set({ status: "stopped", updatedAt: new Date() })
    .where(eq(botsTable.id, params.data.id))
    .returning();
  if (!bot) {
    res.status(404).json({ error: "Bot not found" });
    return;
  }
  await db.insert(botLogsTable).values({
    botId: bot.id,
    level: "info",
    message: `Bot "${bot.name}" stopped`,
  });
  res.json(GetBotResponse.parse(bot));
});

router.post("/bots/:id/restart", async (req, res): Promise<void> => {
  const params = RestartBotParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [bot] = await db
    .update(botsTable)
    .set({ status: "running", updatedAt: new Date() })
    .where(eq(botsTable.id, params.data.id))
    .returning();
  if (!bot) {
    res.status(404).json({ error: "Bot not found" });
    return;
  }
  await db.insert(botLogsTable).values({
    botId: bot.id,
    level: "info",
    message: `Bot "${bot.name}" restarted`,
  });
  res.json(GetBotResponse.parse(bot));
});

router.get("/bots/:id/logs", async (req, res): Promise<void> => {
  const params = GetBotLogsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [bot] = await db.select({ id: botsTable.id }).from(botsTable).where(eq(botsTable.id, params.data.id));
  if (!bot) {
    res.status(404).json({ error: "Bot not found" });
    return;
  }
  const logs = await db
    .select()
    .from(botLogsTable)
    .where(eq(botLogsTable.botId, params.data.id))
    .orderBy(botLogsTable.createdAt);
  res.json(GetBotLogsResponse.parse(logs));
});

router.post("/bots/:id/logs", async (req, res): Promise<void> => {
  const params = AddBotLogParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = AddBotLogBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [log] = await db
    .insert(botLogsTable)
    .values({ botId: params.data.id, ...parsed.data })
    .returning();
  res.status(201).json(log);
});

router.get("/dashboard/stats", async (_req, res): Promise<void> => {
  const bots = await db.select().from(botsTable);
  const total = bots.length;
  const running = bots.filter((b) => b.status === "running").length;
  const stopped = bots.filter((b) => b.status === "stopped").length;
  const error = bots.filter((b) => b.status === "error").length;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const logsResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(botLogsTable)
    .where(sql`${botLogsTable.createdAt} >= ${today}`);
  const totalLogsToday = Number(logsResult[0]?.count ?? 0);

  res.json(
    GetDashboardStatsResponse.parse({ total, running, stopped, error, totalLogsToday })
  );
});

export default router;
