// A username for a new account, which signs up with only an email (or Google): the part of
// the email before the @, made to fit the username rules, with digits added if it is taken.
import "server-only";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";

export async function newUsername(email: string): Promise<string> {
  const base = email.split("@")[0].replace(/[^A-Za-z0-9_.]/g, "").slice(0, 18).padEnd(3, "0");
  for (let i = 0; i < 10; i++) {
    const candidate = i === 0 ? base : `${base}${Math.floor(100 + Math.random() * 900)}`;
    const [taken] = await db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.username, candidate)).limit(1);
    if (!taken) return candidate;
  }
  return `member${crypto.randomUUID().slice(0, 8)}`;
}
