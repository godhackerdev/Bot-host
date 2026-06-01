import { type Request, type Response, type NextFunction } from "express";
import { getAuth } from "@clerk/express";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";

const ADMIN_EMAIL = "hamzanet736@gmail.com";

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const auth = getAuth(req);
  if (!auth?.userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}

export async function requireApproved(req: Request, res: Response, next: NextFunction): Promise<void> {
  const auth = getAuth(req);
  if (!auth?.userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, auth.userId));
  if (!user) {
    res.status(403).json({ error: "User not found. Please sign in again." });
    return;
  }

  if (user.role === "admin") {
    (req as any).dbUser = user;
    next();
    return;
  }

  if (user.approvalStatus !== "approved") {
    res.status(403).json({ error: "Account pending approval", code: "PENDING_APPROVAL" });
    return;
  }

  if (user.approvedUntil && new Date(user.approvedUntil) < new Date()) {
    res.status(403).json({ error: "Subscription expired", code: "SUBSCRIPTION_EXPIRED" });
    return;
  }

  (req as any).dbUser = user;
  next();
}

export async function requireAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  const auth = getAuth(req);
  if (!auth?.userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, auth.userId));
  if (!user || user.role !== "admin") {
    res.status(403).json({ error: "Admin access required" });
    return;
  }

  (req as any).dbUser = user;
  next();
}

export { ADMIN_EMAIL };
