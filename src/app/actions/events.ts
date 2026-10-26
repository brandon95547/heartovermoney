"use server";

// Event actions: register through the card process, like a photo, post one to the photo wall,
// and order food and drink.
import fs from "node:fs/promises";
import crypto from "node:crypto";
import { and, eq, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db, schema as s } from "@/db";
import { CARD_DESIGNS, type CardDesign } from "@/lib/cards";
import { getUser } from "@/lib/dal";
import { UPLOAD_DIR, uploadPath } from "@/lib/uploads";

export type EventActionState = { error?: string } | undefined;

export type RegistrationState = {
  error?: string;
  done?: { design: CardDesign; jokerChoice: "kept" | "gift_card" | null; ship: boolean; slug: string };
} | undefined;

const Registration = z.object({
  eventId: z.uuid(),
  favorite: z.enum(["joker", "queen", "rabbit"]),
  jokerChoice: z.enum(["kept", "gift_card", ""]),
  tagline: z.string().trim().max(80),
  fulfillment: z.enum(["pickup", "ship"]),
  address: z.string().trim().max(300),
});

class RegistrationError extends Error {}

// Reserves one card of the design picked, for the door or the mail. A Joker that ran out of
// time before a choice is kept.
export async function registerForEvent(_: RegistrationState, form: FormData): Promise<RegistrationState> {
  const user = await getUser();
  if (!user) redirect("/signin?next=/events");
  const fields = ["eventId", "favorite", "jokerChoice", "tagline", "fulfillment", "address"];
  const parsed = Registration.safeParse(Object.fromEntries(fields.map((k) => [k, form.get(k) ?? ""])));
  if (!parsed.success) return { error: "Pick a card first." };
  const { eventId, favorite, tagline, fulfillment, address } = parsed.data;
  const ship = fulfillment === "ship";
  if (ship && address.length < 10) return { error: "Enter the full shipping address." };
  const jokerChoice = favorite === "joker" ? parsed.data.jokerChoice || "kept" : null;

  const [event] = await db.select({ slug: s.events.slug }).from(s.events).where(eq(s.events.id, eventId)).limit(1);
  if (!event) return { error: "That event no longer exists." };
  try {
    await db.transaction(async (tx) => {
      const [taken] = await tx.select({ id: s.registrations.id }).from(s.registrations)
        .where(and(eq(s.registrations.eventId, eventId), eq(s.registrations.userId, user.id))).limit(1);
      if (taken) throw new RegistrationError("You're already registered for this event.");
      const [card] = await tx.select({ id: s.cards.id }).from(s.cards)
        .where(and(eq(s.cards.eventId, eventId), eq(s.cards.design, favorite),
          sql`not exists (select 1 from ${s.registrations} where ${s.registrations.cardId} = ${s.cards.id})`))
        .limit(1).for("update", { skipLocked: true });
      if (!card) throw new RegistrationError(`The last ${CARD_DESIGNS[favorite].name} was just claimed. Go back and pick another card.`);
      await tx.insert(s.registrations).values({
        eventId, userId: user.id, cardId: card.id, jokerChoice, fulfillment, shipAddress: ship ? address : null,
      });
      if (tagline) await tx.update(s.users).set({ tagline }).where(eq(s.users.id, user.id));
    });
  } catch (err) {
    if (err instanceof RegistrationError) return { error: err.message };
    // Two submits at once: the database's unique rules turn the second away.
    if ((err as { cause?: { code?: string } }).cause?.code === "23505") return { error: "You're already registered for this event." };
    throw err;
  }
  // No revalidation: it would re-render /events, which sends someone registered on to the
  // event before they see this result. The event's pages read fresh on every visit.
  return { done: { design: favorite, jokerChoice, ship, slug: event.slug } };
}

export async function toggleLike(photoId: string, eventSlug: string) {
  const user = await getUser();
  if (!user) redirect(`/signin?next=${encodeURIComponent(`/events/${eventSlug}/photos`)}`);
  const where = and(eq(s.photoLikes.photoId, photoId), eq(s.photoLikes.userId, user.id));
  const [existing] = await db.select().from(s.photoLikes).where(where).limit(1);
  if (existing) await db.delete(s.photoLikes).where(where);
  else await db.insert(s.photoLikes).values({ photoId, userId: user.id }).onConflictDoNothing();
  revalidatePath(`/events/${eventSlug}/photos`);
  revalidatePath("/posts");
}

const TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const MAX_BYTES = 12 * 1024 * 1024;

export async function postPhoto(_: EventActionState, form: FormData): Promise<EventActionState> {
  const slug = String(form.get("slug") ?? "");
  const user = await getUser();
  if (!user) redirect(`/signin?next=${encodeURIComponent(`/events/${slug}/photos`)}`);
  const [event] = await db.select({ id: s.events.id }).from(s.events).where(eq(s.events.slug, slug)).limit(1);
  if (!event) return { error: "That event no longer exists." };

  const file = form.get("photo");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a photo." };
  const ext = TYPES[file.type];
  if (!ext) return { error: "Photos can be JPEG, PNG or WebP." };
  if (file.size > MAX_BYTES) return { error: "Photos can be up to 12 MB." };

  const name = `${crypto.randomUUID()}.${ext}`;
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  await fs.writeFile(uploadPath(name), Buffer.from(await file.arrayBuffer()));
  const caption = String(form.get("caption") ?? "").trim().slice(0, 200);
  await db.insert(s.photos).values({ eventId: event.id, userId: user.id, image: `/media/${name}`, caption });
  redirect(`/events/${slug}/photos`);
}

export async function orderFood(_: EventActionState, form: FormData): Promise<EventActionState> {
  const slug = String(form.get("slug") ?? "");
  const user = await getUser();
  if (!user) redirect(`/signin?next=${encodeURIComponent(`/events/${slug}/menu`)}`);
  const [event] = await db.select({ id: s.events.id }).from(s.events).where(eq(s.events.slug, slug)).limit(1);
  if (!event) return { error: "That event no longer exists." };

  const wanted = new Map<string, number>();
  for (const [k, v] of form.entries()) {
    if (k.startsWith("qty:")) {
      const n = Math.max(0, Math.min(20, Number(v) || 0));
      if (n) wanted.set(k.slice(4), n);
    }
  }
  if (!wanted.size) return { error: "Choose at least one item." };
  const items = await db.select().from(s.menuItems)
    .where(and(eq(s.menuItems.eventId, event.id), inArray(s.menuItems.id, [...wanted.keys()])));
  if (!items.length) return { error: "Those items are no longer on the menu." };

  const total = items.reduce((t, i) => t + i.priceCents * wanted.get(i.id)!, 0);
  const [order] = await db.insert(s.orders).values({
    userId: user.id, kind: "food", status: "paid", totalCents: total, eventId: event.id, fulfillment: "pickup",
  }).returning({ id: s.orders.id });
  await db.insert(s.orderItems).values(items.map((i) => ({
    orderId: order.id, label: i.name, menuItemId: i.id, quantity: wanted.get(i.id)!, unitPriceCents: i.priceCents,
  })));
  redirect(`/orders/${order.id}`);
}
