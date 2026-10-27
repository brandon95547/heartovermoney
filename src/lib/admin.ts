// The admin panel's guard and its audit log. Server-only. Every admin page calls
// requireAdmin, and every admin action adminActor, rather than trusting the page that showed it.
import "server-only";
import { notFound } from "next/navigation";
import { db, schema } from "@/db";
import { getUser, requireUser } from "@/lib/dal";

export async function requireAdmin(next: string) {
  const user = await requireUser(next);
  if (user.role !== "admin") notFound();
  return user;
}

export class AdminError extends Error {}

// For Server Actions: the signed-in admin, or an error the form shows.
export async function adminActor() {
  const user = await getUser();
  if (user?.role !== "admin") throw new AdminError("Only admins can do that.");
  return user;
}

export async function audit(actorId: string, action: string, target: string, detail = "") {
  await db.insert(schema.auditLog).values({ actorId, action, target, detail });
}

// "Harbor Light" -> "harbor-light", for addresses.
export const slugify = (s: string) =>
  s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
