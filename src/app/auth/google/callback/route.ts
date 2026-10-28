// Back from Google: check it is the same visitor who left, then sign in to the account with
// that email, or create one (username from the email, name from Google). Locations stay
// relative, so the address the app sees behind the proxy never leaks into a redirect.
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { randomBytes } from "node:crypto";
import { db, schema } from "@/db";
import { GOOGLE_COOKIE, googleFinish } from "@/lib/google";
import { safeNext } from "@/lib/next-path";
import { createSession } from "@/lib/session";
import { newUsername } from "@/lib/usernames";

const go = (location: string) => new Response(null, { status: 303, headers: { Location: location } });

export async function GET(request: NextRequest) {
  const jar = await cookies();
  const saved = jar.get(GOOGLE_COOKIE)?.value;
  jar.delete({ name: GOOGLE_COOKIE, path: "/auth/google" });
  let kept: { state?: string; verifier?: string; next?: string } = {};
  try { kept = saved ? JSON.parse(saved) : {}; } catch {}
  const next = safeNext(kept.next);
  const failed = go(`/signin?error=google&next=${encodeURIComponent(next)}`);

  const params = request.nextUrl.searchParams;
  const code = params.get("code");
  if (!code || !kept.state || !kept.verifier || params.get("state") !== kept.state) return failed;
  const person = await googleFinish(code, kept.verifier).catch(() => null);
  if (!person) return failed;

  const [existing] = await db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.email, person.email)).limit(1);
  let userId = existing?.id;
  if (!userId) {
    const username = await newUsername(person.email);
    // No password of its own: "Forgot details?" sets one if they ever want one.
    const [created] = await db.insert(schema.users).values({
      email: person.email, username, displayName: person.name || username,
      passwordHash: await bcrypt.hash(randomBytes(32).toString("hex"), 10),
    }).returning({ id: schema.users.id });
    userId = created.id;
  }
  await createSession(userId);
  return go(next);
}
