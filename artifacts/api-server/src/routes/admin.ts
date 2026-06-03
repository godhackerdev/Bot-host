import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { requireAdmin } from "../middlewares/requireAuth";
import {
  UpdateUserApprovalParams,
  UpdateUserApprovalBody,
} from "@workspace/api-zod";
import type { User } from "@workspace/db";

const router: IRouter = Router();

function serializeUser(user: User) {
  return {
    ...user,
    approvedUntil: user.approvedUntil?.toISOString() ?? null,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt?.toISOString() ?? null,
  };
}

router.get("/admin/users", requireAdmin, async (_req, res): Promise<void> => {
  const users = await db.select().from(usersTable).orderBy(usersTable.createdAt);
  res.json(users.map(serializeUser));
});

router.patch("/admin/users/:id", requireAdmin, async (req, res): Promise<void> => {
  const params = UpdateUserApprovalParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateUserApprovalBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { approvalStatus, durationDays } = parsed.data;

  let approvedUntil: Date | null = null;
  if (approvalStatus === "approved" && durationDays) {
    approvedUntil = new Date();
    approvedUntil.setDate(approvedUntil.getDate() + durationDays);
  }

  const [user] = await db
    .update(usersTable)
    .set({
      approvalStatus,
      approvedUntil,
      updatedAt: new Date(),
    })
    .where(eq(usersTable.id, params.data.id))
    .returning();

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json(serializeUser(user));
});

export default router;
