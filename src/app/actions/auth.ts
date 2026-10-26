"use server";

import bcrypt from "bcryptjs";
import { eq, or } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db, schema } from "@/db";
import { createSession, deleteSession } from "@/lib/session";

export type AuthState = { error?: string; fields?: Record<string, string> } | undefined;

// Only paths on this site, so `next` cannot send someone elsewhere after signing in.
const safeNext = (v: FormDataEntryValue | null) => {
  const s = typeof v === "string" ? v : "";
  return s.startsWith("/") && !s.startsWith("//") ? s : "/";
};

const SignUp = z.object({
  displayName: z.string().trim().min(1, "Enter your name.").max(60),
  username: z.string().trim().regex(/^[A-Za-z0-9_.]{3,24}$/, "Usernames are 3–24 letters, numbers, dots or underscores."),
  email: z.email("Enter a valid email address.").transform((e) => e.toLowerCase()),
  password: z.string().min(8, "Passwords need at least 8 characters."),
  tagline: z.string().trim().max(80).optional(),
});

export async function signUp(_: AuthState, form: FormData): Promise<AuthState> {
  const fields = Object.fromEntries(["displayName", "username", "email", "tagline"].map((k) => [k, String(form.get(k) ?? "")]));
  const parsed = SignUp.safeParse({ ...fields, password: form.get("password") });
  if (!parsed.success) return { error: parsed.error.issues[0].message, fields };
  const { displayName, username, email, password, tagline } = parsed.data;

  const taken = await db.select({ email: schema.users.email }).from(schema.users)
    .where(or(eq(schema.users.email, email), eq(schema.users.username, username))).limit(1);
  if (taken.length) {
    return { error: taken[0].email === email ? "An account with that email already exists." : "That username is taken.", fields };
  }

  const [user] = await db.insert(schema.users).values({
    email, username, displayName, tagline: tagline || null, passwordHash: await bcrypt.hash(password, 10),
  }).returning({ id: schema.users.id });
  await createSession(user.id);
  redirect(safeNext(form.get("next")));
}

export async function signIn(_: AuthState, form: FormData): Promise<AuthState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const [user] = await db.select().from(schema.users).where(eq(schema.users.email, email)).limit(1);
  // One message for both cases, so the form does not reveal which emails have accounts.
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return { error: "That email and password don't match.", fields: { email } };
  }
  await createSession(user.id);
  redirect(safeNext(form.get("next")));
}

export async function signOut() {
  await deleteSession();
  redirect("/");
}
