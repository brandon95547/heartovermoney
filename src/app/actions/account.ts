"use server";

// The account: profile and membership.
import bcrypt from "bcryptjs";
import { and, eq, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db, schema as s } from "@/db";
import { getUser } from "@/lib/dal";
import { CLUB_SEATS, TIERS, tierById } from "@/lib/membership";
import { safeNext, withNext } from "@/lib/next-path";

export type AccountState = { error?: string; ok?: string } | undefined;

async function signedIn(next: string) {
  const user = await getUser();
  if (!user) redirect(`/signin?next=${encodeURIComponent(next)}`);
  return user;
}

const Profile = z.object({
  displayName: z.string().trim().min(1, "Enter your name.").max(60),
  tagline: z.string().trim().max(80),
  shipAddress: z.string().trim().max(300),
});

// Settings: name, the line about you, the default shipping address and email updates.
export async function updateProfile(_: AccountState, form: FormData): Promise<AccountState> {
  const user = await signedIn("/settings");
  const parsed = Profile.safeParse({ displayName: form.get("displayName"), tagline: form.get("tagline") ?? "", shipAddress: form.get("shipAddress") ?? "" });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { displayName, tagline, shipAddress } = parsed.data;
  if (shipAddress && shipAddress.length < 10) return { error: "Enter the full shipping address, or leave it empty." };
  await db.update(s.users).set({
    displayName, tagline: tagline || null, shipAddress: shipAddress || null, emailUpdates: form.get("emailUpdates") === "on",
  }).where(eq(s.users.id, user.id));
  revalidatePath("/settings");
  return { ok: "Saved." };
}

export async function changePassword(_: AccountState, form: FormData): Promise<AccountState> {
  const user = await signedIn("/settings");
  const current = String(form.get("current") ?? "");
  const next = String(form.get("password") ?? "");
  if (next.length < 8) return { error: "New passwords need at least 8 characters." };
  const [row] = await db.select({ hash: s.users.passwordHash }).from(s.users).where(eq(s.users.id, user.id)).limit(1);
  if (!row || !(await bcrypt.compare(current, row.hash))) return { error: "Your current password isn't right." };
  await db.update(s.users).set({ passwordHash: await bcrypt.hash(next, 10) }).where(eq(s.users.id, user.id));
  return { ok: "Your password is changed." };
}

// Test mode: choosing a tier records it; no card is charged until Stripe is set up. `next`
// is where the member was going (the art they tried to buy), and they go back there after.
export async function chooseTier(form: FormData) {
  const next = form.get("next") ? safeNext(form.get("next")) : null;
  const user = await signedIn(next ? withNext("/membership", next) : "/membership");
  const tier = TIERS.find((t) => t.id === form.get("tier"));
  if (!tier) return;
  // The 700 Club has 700 seats; a member moving between club tiers keeps theirs.
  if (tier.club && !tierById(user.membershipTier)?.club) {
    const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(s.users)
      .where(inArray(s.users.membershipTier, TIERS.filter((t) => t.club).map((t) => t.id)));
    if (n >= CLUB_SEATS) redirect(`/membership?full=1${next ? `&next=${encodeURIComponent(next)}` : ""}`);
  }
  await db.update(s.users).set({ membershipTier: tier.id, membershipSince: new Date() }).where(eq(s.users.id, user.id));
  revalidatePath("/membership");
  revalidatePath("/profile");
  if (next) redirect(next);
}

export async function cancelTier() {
  const user = await signedIn("/membership");
  await db.update(s.users).set({ membershipTier: null, membershipSince: null }).where(eq(s.users.id, user.id));
  revalidatePath("/membership");
}

// Follow an artist, or stop following: their new works lead the Products home.
export async function toggleFollow(form: FormData) {
  const slug = String(form.get("slug") ?? "");
  const user = await signedIn(`/artists/${slug}`);
  const [artist] = await db.select({ id: s.artists.id }).from(s.artists).where(eq(s.artists.slug, slug)).limit(1);
  if (!artist) return;
  const where = and(eq(s.follows.userId, user.id), eq(s.follows.artistId, artist.id));
  const [existing] = await db.select().from(s.follows).where(where).limit(1);
  if (existing) await db.delete(s.follows).where(where);
  else await db.insert(s.follows).values({ userId: user.id, artistId: artist.id }).onConflictDoNothing();
  revalidatePath(`/artists/${slug}`);
  revalidatePath("/");
}
