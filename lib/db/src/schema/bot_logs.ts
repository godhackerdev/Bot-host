import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { botsTable } from "./bots";

export const botLogsTable = pgTable("bot_logs", {
  id: serial("id").primaryKey(),
  botId: integer("bot_id").notNull().references(() => botsTable.id, { onDelete: "cascade" }),
  level: text("level").notNull().default("info"),
  message: text("message").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertBotLogSchema = createInsertSchema(botLogsTable).omit({
  id: true,
  createdAt: true,
});

export type InsertBotLog = z.infer<typeof insertBotLogSchema>;
export type BotLog = typeof botLogsTable.$inferSelect;
