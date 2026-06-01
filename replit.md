# BotHost — WhatsApp Bot Hosting Platform

A cloud platform where developers can deploy, manage, and monitor their WhatsApp bots — similar to bothosting.net.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm --filter @workspace/bot-hosting run dev` — run the frontend (port 24722)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + Wouter + shadcn/ui + Tailwind
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — OpenAPI contract (source of truth)
- `lib/db/src/schema/bots.ts` — Bots table schema
- `lib/db/src/schema/bot_logs.ts` — BotLogs table schema
- `artifacts/api-server/src/routes/bots.ts` — All bot + dashboard API routes
- `artifacts/bot-hosting/src/` — React frontend pages and components

## Architecture decisions

- OpenAPI-first: all endpoints defined in `openapi.yaml`, types generated via Orval
- Bot "start/stop/restart" just updates the `status` column + creates a log entry (no actual process management yet)
- Dashboard stats are computed on-the-fly from the bots and bot_logs tables
- Bot logs cascade-delete when a bot is deleted (FK with onDelete: cascade)

## Product

- **Dashboard** — overview stats (total/running/stopped/error bots, logs today)
- **Bot List** — searchable list with status badges, start/stop/restart/delete quick actions
- **Bot Detail** — config view + live-polling log terminal
- **Create/Edit Bot** — forms with validation (name, description, phone, webhook URL, token)

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Body schema component names must NOT match `<OperationIdPascal>Body` — use entity-shaped names (e.g. `BotInput`, not `CreateBotBody`) to avoid Orval TS2308 collisions
- When an operation has both path params AND query params, Orval creates a `{OperationIdPascal}Params` collision — either remove the query param or use a different operationId

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
