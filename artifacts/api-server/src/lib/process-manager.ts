import { spawn, type ChildProcess } from "child_process";
import path from "path";
import fs from "fs";
import AdmZip from "adm-zip";
import { WebSocket } from "ws";
import { db, botsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "./logger";

const processes = new Map<number, ChildProcess>();
const wsClients = new Map<number, Set<WebSocket>>();

export function registerWsClient(botId: number, ws: WebSocket): void {
  if (!wsClients.has(botId)) wsClients.set(botId, new Set());
  wsClients.get(botId)!.add(ws);
  ws.on("close", () => wsClients.get(botId)?.delete(ws));
}

function broadcast(botId: number, type: string, data: string): void {
  const msg = JSON.stringify({ type, data, botId });
  wsClients.get(botId)?.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) ws.send(msg);
  });
}

export function getBotDir(botId: number): string {
  return path.join("/tmp", "bots", String(botId));
}

export async function extractZip(botId: number, zipBuffer: Buffer): Promise<string> {
  const dir = getBotDir(botId);
  fs.mkdirSync(dir, { recursive: true });

  const zip = new AdmZip(zipBuffer);
  const entries = zip.getEntries();

  const rootDirs = new Set<string>();
  entries.forEach((e) => {
    const parts = e.entryName.split("/");
    if (parts[0]) rootDirs.add(parts[0]);
  });

  zip.extractAllTo(dir, true);

  if (rootDirs.size === 1) {
    const inner = path.join(dir, [...rootDirs][0]);
    if (fs.existsSync(inner) && fs.statSync(inner).isDirectory()) {
      const pkgCheck = path.join(inner, "package.json");
      if (fs.existsSync(pkgCheck)) {
        await db.update(botsTable).set({ directory: inner }).where(eq(botsTable.id, botId));
        return inner;
      }
    }
  }

  await db.update(botsTable).set({ directory: dir }).where(eq(botsTable.id, botId));
  return dir;
}

export async function runInstall(botId: number, dir: string): Promise<void> {
  await db.update(botsTable).set({ installStatus: "installing", updatedAt: new Date() }).where(eq(botsTable.id, botId));
  broadcast(botId, "system", "📦 Running npm install...\n");

  return new Promise((resolve, reject) => {
    const proc = spawn("npm", ["install"], {
      cwd: dir,
      env: { ...process.env, NODE_ENV: undefined },
      stdio: ["ignore", "pipe", "pipe"],
    });

    proc.stdout.on("data", (chunk: Buffer) => broadcast(botId, "stdout", chunk.toString()));
    proc.stderr.on("data", (chunk: Buffer) => broadcast(botId, "stderr", chunk.toString()));

    proc.on("close", async (code) => {
      if (code === 0) {
        await db.update(botsTable).set({ installStatus: "ready", updatedAt: new Date() }).where(eq(botsTable.id, botId));
        broadcast(botId, "system", "✅ Install complete. You can now start the bot.\n");
        resolve();
      } else {
        await db.update(botsTable).set({ installStatus: "failed", updatedAt: new Date() }).where(eq(botsTable.id, botId));
        broadcast(botId, "system", `❌ Install failed with exit code ${code}\n`);
        reject(new Error(`npm install failed: code ${code}`));
      }
    });
  });
}

export async function startProcess(botId: number, dir: string): Promise<void> {
  if (processes.has(botId)) await stopProcess(botId);

  const pkgPath = path.join(dir, "package.json");
  let command = "node";
  let args: string[] = [];

  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
      if (pkg.scripts?.start) {
        command = "npm";
        args = ["start"];
      } else if (pkg.main) {
        args = [pkg.main];
      } else {
        args = ["index.js"];
      }
    } catch {
      args = ["index.js"];
    }
  } else {
    args = ["index.js"];
  }

  broadcast(botId, "system", `🚀 Starting bot: ${command} ${args.join(" ")}\n`);

  const proc = spawn(command, args, {
    cwd: dir,
    env: { ...process.env },
    stdio: ["pipe", "pipe", "pipe"],
  });

  processes.set(botId, proc);

  await db.update(botsTable).set({ status: "running", updatedAt: new Date() }).where(eq(botsTable.id, botId));

  proc.stdout.on("data", async (chunk: Buffer) => {
    const text = chunk.toString();
    broadcast(botId, "stdout", text);
    await db.insert(botLogsTable).values({ botId, level: "info", message: text.trim().slice(0, 500) }).catch(() => {});
  });

  proc.stderr.on("data", async (chunk: Buffer) => {
    const text = chunk.toString();
    broadcast(botId, "stderr", text);
    await db.insert(botLogsTable).values({ botId, level: "error", message: text.trim().slice(0, 500) }).catch(() => {});
  });

  proc.on("close", async (code) => {
    processes.delete(botId);
    const status = code === 0 ? "stopped" : "error";
    broadcast(botId, "system", `\n⚡ Process exited with code ${code}\n`);
    await db.update(botsTable).set({ status, updatedAt: new Date() }).where(eq(botsTable.id, botId)).catch(() => {});
    logger.info({ botId, code }, "Bot process exited");
  });

  proc.on("error", async (err) => {
    broadcast(botId, "system", `❌ Failed to start: ${err.message}\n`);
    processes.delete(botId);
    await db.update(botsTable).set({ status: "error", updatedAt: new Date() }).where(eq(botsTable.id, botId)).catch(() => {});
  });
}

export async function stopProcess(botId: number): Promise<void> {
  const proc = processes.get(botId);
  if (!proc) return;
  proc.kill("SIGTERM");
  processes.delete(botId);
  await db.update(botsTable).set({ status: "stopped", updatedAt: new Date() }).where(eq(botsTable.id, botId));
  broadcast(botId, "system", "🛑 Bot process stopped.\n");
}

export function sendInput(botId: number, text: string): boolean {
  const proc = processes.get(botId);
  if (!proc || !proc.stdin) return false;
  proc.stdin.write(text + "\n");
  broadcast(botId, "stdin", text + "\n");
  return true;
}

export function isRunning(botId: number): boolean {
  return processes.has(botId);
}

import { botLogsTable } from "@workspace/db";
