import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import app from "./app";
import { logger } from "./lib/logger";
import { registerWsClient } from "./lib/process-manager";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error("PORT environment variable is required but was not provided.");
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const server = createServer(app);

const wss = new WebSocketServer({ server, path: "/ws" });

wss.on("connection", (ws: WebSocket, req) => {
  const url = new URL(req.url ?? "", `http://localhost`);
  const botIdStr = url.searchParams.get("botId");
  const botId = botIdStr ? parseInt(botIdStr, 10) : NaN;

  if (isNaN(botId)) {
    ws.close(4000, "Missing or invalid botId query param");
    return;
  }

  logger.info({ botId }, "WebSocket client connected");
  registerWsClient(botId, ws);

  ws.on("close", () => logger.info({ botId }, "WebSocket client disconnected"));
});

server.listen(port, () => {
  logger.info({ port }, "Server listening");
});
