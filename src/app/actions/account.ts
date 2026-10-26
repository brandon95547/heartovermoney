"use server";

// The account: profile and membership.
import { eq, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db, schema as s } from "@/db";
import { getUser } from "@/lib/dal";
import { CLUB_SEATS, TIERS, tierById } from "@/lib/membership";

export type AccountState = { error?: string; ok?: string } | undefined;

async function signedIn(next: string) {
  const user = await getUser();
  if (!user) redirect(`/signin?next=${encodeURIComponent(next)}`);
  return user;
}

const Profile = z.object({
  displayName: z.string().trim().min(1, "Enter your name.").max(60),
  tagline: z.string().trim().max(80),
});

export async function updateProfile(_: AccountState, form: FormData): Promise<AccountState> {
  const user = await signedIn("/settings");
  const parsed = Profile.safeParse({ displayName: form.get("displayName"), tagline: form.get("tagline") ?? "" });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  await db.update(s.users).set({ displayName: parsed.data.displayName, tagline: parsed.data.tagline || null }).where(eq(s.users.id, user.id));
  revalidatePath("/settings");
  return { ok: "Saved." };
}

// Test mode: choosing a tier records it; no card is charged until Stripe is set up.
export async function chooseTier(form: FormData) {
  const user = await signedIn("/membership");
  const tier = TIERS.find((t) => t.id === form.get("tier"));
  if (!tier) return;
  // The 700 Club has 700 seats; a member moving between club tiers keeps theirs.
  if (tier.club && !tierById(user.membershipTier)?.club) {
    const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(s.users)
      .where(inArray(s.users.membershipTier, TIERS.filter((t) => t.club).map((t) => t.id)));
    if (n >= CLUB_SEATS) redirect("/membership?full=1");
  }
  await db.update(s.users).set({ membershipTier: tier.id, membershipSince: new Date() }).where(eq(s.users.id, user.id));
  revalidatePath("/membership");
  revalidatePath("/profile");
}

export async function cancelTier() {
  const user = await signedIn("/membership");
  await db.update(s.users).set({ membershipTier: null, membershipSince: null }).where(eq(s.users.id, user.id));
  revalidatePath("/membership");
}
