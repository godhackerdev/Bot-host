import { Router, type IRouter } from "express";
import { getAuth, clerkClient } from "@clerk/express";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { requireAuth, ADMIN_EMAIL } from "../middlewares/requireAuth";
import { GetMeResponse } from "@workspace/api-zod";
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

router.get("/auth/me", requireAuth, async (req, res): Promise<void> => {
  const auth = getAuth(req);
  if (!auth?.userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  let [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, auth.userId));

  if (!user) {
    let clerkEmail = "";
    let clerkName: string | null = null;
    let clerkPicture: string | null = null;
    try {
      const clerkUser = await clerkClient.users.getUser(auth.userId);
      clerkEmail = clerkUser.emailAddresses?.[0]?.emailAddress ?? "";
      clerkName = clerkUser.fullName ?? null;
      clerkPicture = clerkUser.imageUrl ?? null;
    } catch (err) {
      req.log.error({ err }, "Failed to fetch Clerk user profile");
    }

    const isAdmin = clerkEmail.toLowerCase() === ADMIN_EMAIL.toLowerCase();

    const [created] = await db
      .insert(usersTable)
      .values({
        clerkId: auth.userId,
        email: clerkEmail,
        name: clerkName,
        picture: clerkPicture,
        role: isAdmin ? "admin" : "user",
        approvalStatus: isAdmin ? "approved" : "pending",
        approvedUntil: null,
      })
      .onConflictDoUpdate({
        target: usersTable.clerkId,
        set: {
          name: clerkName,
          picture: clerkPicture,
          updatedAt: new Date(),
        },
      })
      .returning();
    user = created;
  }

  res.json(GetMeResponse.parse(serializeUser(user)));
});

export default router;
