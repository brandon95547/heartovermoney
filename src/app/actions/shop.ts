"use server";

// Buying: the cart, checkout, Buy Now and bids. Payment is simulated (orders are marked paid)
// until Stripe test keys are configured. Every action checks the signed-in user itself.
import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db, schema as s } from "@/db";
import { getUser } from "@/lib/dal";
import { certificateCode } from "@/lib/certificates";
import { needsVip } from "@/lib/membership";

export type ActionState = { error?: string; ok?: string } | undefined;

const VIP_ONLY = "Art is for VIP members. Become a VIP from $25 a month.";
// The auction's rules (development overview page 6, and the client's "art is VIP only"): Buy
// Now before the event is an early deal for VIPs; at the live auction anyone signed in can bid,
// except on art, which stays VIP-only.
const EARLY_VIP_ONLY = "Buy Now before the event is an early deal for VIP members. Become a VIP from $25 a month.";
const ART_LOT_VIP_ONLY = "Art lots are for VIP members. Become a VIP from $25 a month.";

async function signedIn(next: string) {
  const user = await getUser();
  if (!user) redirect(`/signin?next=${encodeURIComponent(next)}`);
  return user;
}

export async function addToCart(_: ActionState, form: FormData): Promise<ActionState> {
  const slug = String(form.get("slug") ?? "");
  const user = await signedIn(`/art/${slug}`);
  const [piece] = await db.select({ id: s.artworks.id, size: s.artworks.editionSize, kind: s.artworks.kind })
    .from(s.artworks).where(eq(s.artworks.slug, slug)).limit(1);
  if (!piece) return { error: "That piece no longer exists." };
  if (needsVip(piece.kind) && !user.isVip) return { error: VIP_ONLY };
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(s.editions).where(eq(s.editions.artworkId, piece.id));
  if (n >= piece.size) return { error: "This edition is sold out. It will never be reprinted." };
  await db.insert(s.cartItems).values({ userId: user.id, artworkId: piece.id, quantity: 1 })
    .onConflictDoUpdate({ target: [s.cartItems.userId, s.cartItems.artworkId], set: { quantity: sql`${s.cartItems.quantity} + 1` } });
  redirect("/cart");
}

export async function setCartQuantity(form: FormData) {
  const user = await signedIn("/cart");
  const artworkId = String(form.get("artworkId") ?? "");
  const quantity = Math.max(0, Math.min(10, Number(form.get("quantity")) || 0));
  const where = and(eq(s.cartItems.userId, user.id), eq(s.cartItems.artworkId, artworkId));
  if (quantity === 0) await db.delete(s.cartItems).where(where);
  else await db.update(s.cartItems).set({ quantity }).where(where);
  revalidatePath("/cart");
}

export async function checkout(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await signedIn("/cart");
  const fulfillment = form.get("fulfillment") === "ship" ? "ship" : "pickup";
  const shipAddress = String(form.get("address") ?? "").trim();
  if (fulfillment === "ship" && shipAddress.length < 10) return { error: "Enter the full shipping address." };

  let orderId: string;
  try {
    orderId = await db.transaction(async (tx) => {
      const items = await tx.select({
        artworkId: s.cartItems.artworkId, quantity: s.cartItems.quantity, title: s.artworks.title,
        priceCents: s.artworks.priceCents, editionSize: s.artworks.editionSize, prefix: s.artworks.certificatePrefix, kind: s.artworks.kind,
        cityName: s.cities.name, cityState: s.cities.state,
      }).from(s.cartItems)
        .innerJoin(s.artworks, eq(s.artworks.id, s.cartItems.artworkId))
        .innerJoin(s.cities, eq(s.cities.id, s.artworks.cityId))
        .where(eq(s.cartItems.userId, user.id));
      if (!items.length) throw new CheckoutError("Your cart is empty.");
      if (!user.isVip && items.some((i) => needsVip(i.kind))) throw new CheckoutError(VIP_ONLY);

      const total = items.reduce((t, i) => t + i.priceCents * i.quantity, 0);
      const [order] = await tx.insert(s.orders).values({
        userId: user.id, kind: "art", status: "paid", totalCents: total, fulfillment, shipAddress: fulfillment === "ship" ? shipAddress : null,
      }).returning({ id: s.orders.id });

      for (const i of items) {
        // Lock the artwork so two checkouts can't take the same edition numbers.
        await tx.execute(sql`select id from ${s.artworks} where id = ${i.artworkId} for update`);
        const [{ n }] = await tx.select({ n: sql<number>`count(*)::int` }).from(s.editions).where(eq(s.editions.artworkId, i.artworkId));
        if (n + i.quantity > i.editionSize) {
          throw new CheckoutError(`Only ${i.editionSize - n} of "${i.title}" are left.`);
        }
        await tx.insert(s.orderItems).values({ orderId: order.id, label: i.title, artworkId: i.artworkId, quantity: i.quantity, unitPriceCents: i.priceCents });
        const issuedAt = new Date();
        for (let k = 1; k <= i.quantity; k++) {
          const number = n + k;
          const [edition] = await tx.insert(s.editions).values({
            artworkId: i.artworkId, number, ownerId: user.id, orderId: order.id, issuedAt,
            certificateCode: certificateCode({ title: i.title, number, editionSize: i.editionSize, city: i.cityName, state: i.cityState, issuedAt, artistPrefix: i.prefix }),
          }).returning({ id: s.editions.id });
          // The first line of the piece's ownership record.
          await tx.insert(s.provenance).values({ editionId: edition.id, kind: "issued", toUserId: user.id, at: issuedAt });
        }
      }
      await tx.delete(s.cartItems).where(eq(s.cartItems.userId, user.id));
      return order.id;
    });
  } catch (err) {
    if (err instanceof CheckoutError) return { error: err.message };
    throw err;
  }
  redirect(`/orders/${orderId}`);
}

class CheckoutError extends Error {}

export async function buyNow(_: ActionState, form: FormData): Promise<ActionState> {
  const lotId = String(form.get("lotId") ?? "");
  const user = await signedIn(`/auctions/${lotId}`);
  if (!user.isVip) return { error: EARLY_VIP_ONLY };
  const now = new Date();
  let orderId: string;
  try {
    orderId = await db.transaction(async (tx) => {
      await tx.execute(sql`select id from ${s.lots} where id = ${lotId} for update`);
      const [lot] = await tx.select().from(s.lots).where(eq(s.lots.id, lotId)).limit(1);
      if (!lot || lot.status !== "open" || !lot.buyNowCents) throw new CheckoutError("This lot can no longer be bought outright.");
      if (now >= lot.auctionStartsAt) throw new CheckoutError("The live auction has started. Place a bid instead.");
      const [order] = await tx.insert(s.orders).values({
        userId: user.id, kind: "lot", status: "paid", totalCents: lot.buyNowCents, eventId: lot.eventId, fulfillment: "pickup",
      }).returning({ id: s.orders.id });
      await tx.insert(s.orderItems).values({ orderId: order.id, label: lot.title, lotId: lot.id, unitPriceCents: lot.buyNowCents });
      await tx.update(s.lots).set({ status: "sold", buyerId: user.id, soldCents: lot.buyNowCents }).where(eq(s.lots.id, lot.id));
      return order.id;
    });
  } catch (err) {
    if (err instanceof CheckoutError) return { error: err.message };
    throw err;
  }
  redirect(`/orders/${orderId}`);
}

// The next bid must beat the current one by at least this much.
const minIncrement = (cents: number) => (cents < 100_000 ? 2_500 : 5_000);

export async function placeBid(_: ActionState, form: FormData): Promise<ActionState> {
  const lotId = String(form.get("lotId") ?? "");
  const user = await signedIn(`/auctions/${lotId}`);
  const amountCents = Math.round(Number(form.get("amount")) * 100);
  if (!Number.isFinite(amountCents) || amountCents <= 0) return { error: "Enter a bid amount." };
  const now = new Date();
  try {
    await db.transaction(async (tx) => {
      await tx.execute(sql`select id from ${s.lots} where id = ${lotId} for update`);
      const [lot] = await tx.select().from(s.lots).where(eq(s.lots.id, lotId)).limit(1);
      if (!lot || lot.status !== "open") throw new CheckoutError("Bidding on this lot has closed.");
      if (lot.isArt && !user.isVip) throw new CheckoutError(ART_LOT_VIP_ONLY);
      if (now < lot.auctionStartsAt) throw new CheckoutError("Bidding opens when the live auction starts at the event.");
      if (now > lot.auctionEndsAt) throw new CheckoutError("Bidding on this lot has closed.");
      const [{ top }] = await tx.select({ top: sql<number | null>`max(${s.bids.amountCents})` }).from(s.bids).where(eq(s.bids.lotId, lotId));
      const min = top ? top + minIncrement(top) : lot.startingBidCents;
      if (amountCents < min) throw new CheckoutError(`Bids start at $${(min / 100).toLocaleString("en-US")}.`);
      await tx.insert(s.bids).values({ lotId, userId: user.id, amountCents });
    });
  } catch (err) {
    if (err instanceof CheckoutError) return { error: err.message };
    throw err;
  }
  revalidatePath(`/auctions/${lotId}`);
  revalidatePath("/auctions");
  return { ok: "Your bid is in. You're the highest bidder." };
}
