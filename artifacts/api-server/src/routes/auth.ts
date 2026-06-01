import { Router, type IRouter } from "express";
import { getAuth, clerkClient } from "@clerk/express";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { requireAuth, ADMIN_EMAIL } from "../middlewares/requireAuth";
import { GetMeResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/auth/me", requireAuth, async (req, res): Promise<void> => {
  const auth = getAuth(req);
  if (!auth?.userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  let [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, auth.userId));

  if (!user) {
    let clerkUser: { emailAddresses?: { emailAddress: string }[]; fullName?: string; imageUrl?: string } | null = null;
    try {
      const clerk = await clerkClient();
      clerkUser = await clerk.users.getUser(auth.userId);
    } catch {
      clerkUser = null;
    }

    const email = clerkUser?.emailAddresses?.[0]?.emailAddress ?? "";
    const isAdmin = email.toLowerCase() === ADMIN_EMAIL.toLowerCase();

    const [created] = await db
      .insert(usersTable)
      .values({
        clerkId: auth.userId,
        email,
        name: clerkUser?.fullName ?? null,
        picture: clerkUser?.imageUrl ?? null,
        role: isAdmin ? "admin" : "user",
        approvalStatus: isAdmin ? "approved" : "pending",
        approvedUntil: isAdmin ? null : null,
      })
      .onConflictDoUpdate({
        target: usersTable.clerkId,
        set: {
          name: clerkUser?.fullName ?? null,
          picture: clerkUser?.imageUrl ?? null,
          updatedAt: new Date(),
        },
      })
      .returning();
    user = created;
  }

  res.json(GetMeResponse.parse(user));
});

export default router;
