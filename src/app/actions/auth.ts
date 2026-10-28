"use server";

import bcrypt from "bcryptjs";
import { and, eq, isNull } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db, schema } from "@/db";
import { sendMail } from "@/lib/mail";
import { safeNext } from "@/lib/next-path";
import { RESET_HOURS, findReset, hashToken, newResetToken } from "@/lib/password-reset";
import { createSession, deleteSession } from "@/lib/session";
import { siteUrl } from "@/lib/site";
import { newUsername } from "@/lib/usernames";

export type AuthState = { error?: string; fields?: Record<string, string> } | undefined;


// Creating an account takes only an email and a password, the fields of the design's sign-in
// page. The username shown on posts is made from the email, and the name starts as it.
const SignUp = z.object({
  email: z.email("Enter a valid email address.").transform((e) => e.toLowerCase()),
  password: z.string().min(8, "Passwords need at least 8 characters."),
});

export async function signUp(_: AuthState, form: FormData): Promise<AuthState> {
  const fields = { email: String(form.get("email") ?? "") };
  const parsed = SignUp.safeParse({ ...fields, password: form.get("password") });
  if (!parsed.success) return { error: parsed.error.issues[0].message, fields };
  const { email, password } = parsed.data;

  const [taken] = await db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.email, email)).limit(1);
  if (taken) return { error: "An account with that email already exists. Sign in instead.", fields };

  const username = await newUsername(email);
  const [user] = await db.insert(schema.users).values({
    email, username, displayName: username, passwordHash: await bcrypt.hash(password, 10),
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

// "Forgot details?": emails a link to set a new password. The answer is the same whether or
// not the email has an account, so the form can't be used to find out who has one.
export type ResetState = { error?: string; sent?: boolean } | undefined;

export async function requestPasswordReset(_: ResetState, form: FormData): Promise<ResetState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  if (!z.email().safeParse(email).success) return { error: "Enter the email address you signed up with." };
  const [user] = await db.select({ id: schema.users.id, displayName: schema.users.displayName })
    .from(schema.users).where(eq(schema.users.email, email)).limit(1);
  if (user) {
    const token = newResetToken();
    await db.insert(schema.passwordResets).values({
      userId: user.id, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + RESET_HOURS * 3_600_000),
    });
    await sendMail({
      to: email,
      subject: "Set a new password for Heart Over Money",
      text: `Hi ${user.displayName},\n\nSet a new password here (the link works for an hour, once):\n${siteUrl()}/reset-password/${token}\n\nIf you didn't ask for this, you can ignore this email; your password hasn't changed.\n\nHeart Over Money`,
    });
  }
  return { sent: true };
}

export async function resetPassword(_: ResetState, form: FormData): Promise<ResetState> {
  const token = String(form.get("token") ?? "");
  const password = String(form.get("password") ?? "");
  if (password.length < 8) return { error: "Passwords need at least 8 characters." };
  const reset = await findReset(token);
  if (!reset) return { error: "This link has expired or was already used. Ask for a new one." };
  await db.transaction(async (tx) => {
    await tx.update(schema.users).set({ passwordHash: await bcrypt.hash(password, 10) }).where(eq(schema.users.id, reset.userId));
    // Every outstanding link for this account stops working once one is used.
    await tx.update(schema.passwordResets).set({ usedAt: new Date() })
      .where(and(eq(schema.passwordResets.userId, reset.userId), isNull(schema.passwordResets.usedAt)));
  });
  await createSession(reset.userId);
  redirect("/profile?reset=1");
}
