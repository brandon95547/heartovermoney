// Password reset links: only a hash of each token is stored, and a link is good once, for an hour.
import "server-only";
import crypto from "node:crypto";
import { and, eq, gt, isNull } from "drizzle-orm";
import { db, schema } from "@/db";

export const RESET_HOURS = 1;
export const hashToken = (token: string) => crypto.createHash("sha256").update(token).digest("hex");
export const newResetToken = () => crypto.randomBytes(32).toString("base64url");

// The reset link, if it's still good: unused and not expired.
export async function findReset(token: string) {
  if (!token || token.length > 100) return null;
  const [row] = await db.select({ id: schema.passwordResets.id, userId: schema.passwordResets.userId })
    .from(schema.passwordResets)
    .where(and(eq(schema.passwordResets.tokenHash, hashToken(token)), isNull(schema.passwordResets.usedAt), gt(schema.passwordResets.expiresAt, new Date())))
    .limit(1);
  return row ?? null;
}
