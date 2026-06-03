import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import pinoHttp from "pino-http";

const app = express();

app.use(cors());
app.use(express.json());

// FIXED logger (Vercel safe)
const logger = pinoHttp({
  transport: {
    target: "pino-pretty",
  },
});

app.use(logger);

// test route
app.get("/", (req: Request, res: Response) => {
  res.json({ message: "Bot-host API is running 🚀" });
});

app.get("/health", (req: Request, res: Response) => {
  res.json({ status: "ok" });
});

export default app;
