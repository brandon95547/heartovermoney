"use server";

// Members: a role or membership changed by hand (a complimentary VIP, a correction), always
// with a reason in the audit log, and emailing someone a password reset link.
import { eq, inArray, sql } from "drizzle-orm";
import { db, schema as s } from "@/db";
import type { AdminState } from "@/components/admin-form";
import { AdminError, adminActor, audit } from "@/lib/admin";
import { isUuid, text } from "@/lib/admin-forms";
import { attempt, refreshSite } from "@/lib/admin-run";
import { sendMail } from "@/lib/mail";
import { CLUB_SEATS, TIERS, tierById } from "@/lib/membership";
import { RESET_HOURS, hashToken, newResetToken } from "@/lib/password-reset";
import { siteUrl } from "@/lib/site";

const ROLES = ["member", "vip", "admin"] as const;

async function member(id: FormDataEntryValue | null) {
  if (!isUuid(id)) throw new AdminError("That account no longer exists.");
  const [u] = await db.select().from(s.users).where(eq(s.users.id, id)).limit(1);
  if (!u) throw new AdminError("That account no longer exists.");
  return u;
}

export async function setRole(_: AdminState, form: FormData): Promise<AdminState> {
  return attempt(async () => {
    const admin = await adminActor();
    const u = await member(form.get("id"));
    const role = ROLES.find((r) => r === form.get("role"));
    const reason = text(form, "reason", 300);
    if (!role) throw new AdminError("Choose a role.");
    if (!reason) throw new AdminError("Say why, for the record.");
    if (u.id === admin.id && role !== "admin") throw new AdminError("You can't take away your own admin access.");
    await db.update(s.users).set({ role }).where(eq(s.users.id, u.id));
    await audit(admin.id, `changed the role (${u.role} → ${role}) of`, `@${u.username}`, reason);
    refreshSite();
    return { ok: "Saved." };
  });
}

// A membership set by hand. When card payments arrive, memberships will come from the payment
// provider; this stays for corrections and complimentary memberships, with a reason.
export async function setTier(_: AdminState, form: FormData): Promise<AdminState> {
  return attempt(async () => {
    const admin = await adminActor();
    const u = await member(form.get("id"));
    const value = String(form.get("tier") ?? "");
    const tier = value ? TIERS.find((t) => t.id === value) : null;
    const reason = text(form, "reason", 300);
    if (value && !tier) throw new AdminError("Choose a membership.");
    if (!reason) throw new AdminError("Say why, for the record.");
    if (tier?.club && !tierById(u.membershipTier)?.club) {
      const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(s.users).where(inArray(s.users.membershipTier, TIERS.filter((t) => t.club).map((t) => t.id)));
      if (n >= CLUB_SEATS) throw new AdminError(`All ${CLUB_SEATS} seats in the 700 Club are taken.`);
    }
    await db.update(s.users).set({ membershipTier: tier?.id ?? null, membershipSince: tier ? (u.membershipSince ?? new Date()) : null }).where(eq(s.users.id, u.id));
    await audit(admin.id, `changed the membership (${tierById(u.membershipTier)?.name ?? "none"} → ${tier?.name ?? "none"}) of`, `@${u.username}`, reason);
    refreshSite();
    return { ok: "Saved." };
  });
}

export async function emailResetLink(_: AdminState, form: FormData): Promise<AdminState> {
  return attempt(async () => {
    const admin = await adminActor();
    const u = await member(form.get("id"));
    const token = newResetToken();
    await db.insert(s.passwordResets).values({ userId: u.id, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + RESET_HOURS * 3_600_000) });
    await sendMail({
      to: u.email,
      subject: "Set a new password for Heart Over Money",
      text: `Hi ${u.displayName},\n\nThe Heart Over Money team sent you a link to set a new password (it works for an hour, once):\n${siteUrl()}/reset-password/${token}\n\nHeart Over Money`,
    });
    await audit(admin.id, "emailed a password reset link to", `@${u.username}`);
    return { ok: `Sent to ${u.email}.` };
  });
}
