"use server";

// The account: profile, membership, and finishing card onboarding.
import { and, eq, isNull, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db, schema as s } from "@/db";
import { getUser } from "@/lib/dal";
import { TIERS } from "@/lib/membership";

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
  await db.update(s.users).set({ membershipTier: tier.id, membershipSince: new Date() }).where(eq(s.users.id, user.id));
  revalidatePath("/membership");
  revalidatePath("/profile");
}

export async function cancelTier() {
  const user = await signedIn("/membership");
  await db.update(s.users).set({ membershipTier: null, membershipSince: null }).where(eq(s.users.id, user.id));
  revalidatePath("/membership");
}

const Claim = z.object({
  favorite: z.enum(["joker", "queen", "rabbit"]),
  code: z.string().trim().toUpperCase().max(20),
  tagline: z.string().trim().max(80),
  fulfillment: z.enum(["pickup", "ship"]),
  address: z.string().trim().max(300),
});

export async function completeOnboarding(_: AccountState, form: FormData): Promise<AccountState> {
  const user = await signedIn("/start");
  const parsed = Claim.safeParse(Object.fromEntries(["favorite", "code", "tagline", "fulfillment", "address"].map((k) => [k, form.get(k) ?? ""])));
  if (!parsed.success) return { error: "Pick a favorite card first." };
  const { favorite, code, tagline, fulfillment, address } = parsed.data;
  if (fulfillment === "ship" && address.length < 10) return { error: "Enter the full shipping address." };

  if (code) {
    const [card] = await db.select().from(s.cards).where(eq(s.cards.code, code)).limit(1);
    if (!card) return { error: "We couldn't find that card number. Check the back of your card." };
    if (card.claimedById && card.claimedById !== user.id) return { error: "That card has already been claimed." };
    const claimed = await db.update(s.cards).set({
      claimedById: user.id, favoriteDesign: favorite, fulfillment, shipAddress: fulfillment === "ship" ? address : null, claimedAt: new Date(),
    }).where(and(eq(s.cards.id, card.id), or(isNull(s.cards.claimedById), eq(s.cards.claimedById, user.id)))).returning({ id: s.cards.id });
    if (!claimed.length) return { error: "That card has already been claimed." };
  }
  if (tagline) await db.update(s.users).set({ tagline }).where(eq(s.users.id, user.id));
  return { ok: code ? `Card ${code} is yours.` : "You're in." };
}
