// Data access layer: who is signed in. Server-only, so no client bundle can reach it.
// Callers render inside <Suspense> (cookies are request data), and every Server Action
// checks the user again rather than trusting the page that showed the form.
import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { readSession } from "@/lib/session";

export type CurrentUser = {
  id: string;
  username: string;
  displayName: string;
  email: string;
  tagline: string | null;
  role: "member" | "vip" | "admin";
  membershipTier: string | null;
  isVip: boolean;
};

export const getUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await readSession();
  if (!session) return null;
  const [u] = await db.select().from(schema.users).where(eq(schema.users.id, session.userId)).limit(1);
  if (!u) return null;
  return {
    id: u.id, username: u.username, displayName: u.displayName, email: u.email, tagline: u.tagline,
    role: u.role, membershipTier: u.membershipTier, isVip: u.role === "vip" || u.role === "admin",
  };
});

// Sends a signed-out visitor to sign in, and back to `next` afterwards.
export async function requireUser(next: string): Promise<CurrentUser> {
  const user = await getUser();
  if (!user) redirect(`/signin?next=${encodeURIComponent(next)}`);
  return user;
}
