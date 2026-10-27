"use server";

// Event actions: register through the card process, like a photo, post one to the photo wall,
// moderate the wall, and order food and drink.
import fs from "node:fs/promises";
import crypto from "node:crypto";
import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db, schema as s } from "@/db";
import { CARD_DESIGNS, type CardDesign } from "@/lib/cards";
import { getUser } from "@/lib/dal";
import { checkInQr } from "@/lib/check-in";
import { UPLOAD_DIR, uploadPath } from "@/lib/uploads";

export type EventActionState = { error?: string } | undefined;

export type RegistrationState = {
  error?: string;
  done?: { design: CardDesign; jokerChoice: "kept" | "gift_card" | null; ship: boolean; slug: string; code: string; qr: string };
} | undefined;

const Registration = z.object({
  eventId: z.uuid(),
  favorite: z.enum(["joker", "queen", "rabbit"]),
  tagline: z.string().trim().max(80),
  fulfillment: z.enum(["pickup", "ship"]),
  address: z.string().trim().max(300),
});

class RegistrationError extends Error {}

// The Joker's two minutes, timed on the server (joker_timers): the clock starts the first
// time the guest reaches the Joker's step and never restarts, and only a choice recorded
// before it runs out counts. Otherwise the Joker is kept.
const JOKER_MS = 120_000;
const JOKER_GRACE_MS = 3_000; // the request's own travel time
type JokerChoice = "kept" | "gift_card";

async function jokerTimer(eventId: string, userId: string) {
  const [row] = await db.select().from(s.jokerTimers)
    .where(and(eq(s.jokerTimers.eventId, eventId), eq(s.jokerTimers.userId, userId))).limit(1);
  return row ?? null;
}

// Starts the clock (or finds it running). Returns when it ends and the server's time now, so
// the page can count down without trusting the phone's clock.
export async function startJokerTimer(eventId: string): Promise<{ deadline: number; now: number; choice: JokerChoice | null } | null> {
  const user = await getUser();
  if (!user || !isId(eventId)) return null;
  await db.insert(s.jokerTimers).values({ eventId, userId: user.id }).onConflictDoNothing();
  const timer = await jokerTimer(eventId, user.id);
  if (!timer) return null;
  return { deadline: timer.startedAt.getTime() + JOKER_MS, now: Date.now(), choice: timer.choice };
}

// Records the choice if the clock is still running; once it has run out, the Joker is kept.
export async function chooseJoker(eventId: string, choice: JokerChoice): Promise<{ choice: JokerChoice; late: boolean }> {
  const user = await getUser();
  if (!user || !isId(eventId) || (choice !== "kept" && choice !== "gift_card")) return { choice: "kept", late: true };
  const timer = await jokerTimer(eventId, user.id);
  const where = and(eq(s.jokerTimers.eventId, eventId), eq(s.jokerTimers.userId, user.id));
  if (!timer || Date.now() > timer.startedAt.getTime() + JOKER_MS + JOKER_GRACE_MS) {
    if (timer && !timer.choice) await db.update(s.jokerTimers).set({ choice: "kept", chosenAt: new Date() }).where(where);
    return { choice: timer?.choice ?? "kept", late: true };
  }
  await db.update(s.jokerTimers).set({ choice, chosenAt: new Date() }).where(where);
  return { choice, late: false };
}

// Reserves one card of the design picked, for the door or the mail. The Joker's outcome is
// what the server recorded while its clock ran; with nothing recorded, the Joker is kept.
export async function registerForEvent(_: RegistrationState, form: FormData): Promise<RegistrationState> {
  const user = await getUser();
  if (!user) redirect("/signin?next=/events");
  const fields = ["eventId", "favorite", "tagline", "fulfillment", "address"];
  const parsed = Registration.safeParse(Object.fromEntries(fields.map((k) => [k, form.get(k) ?? ""])));
  if (!parsed.success) return { error: "Pick a card first." };
  const { eventId, favorite, tagline, fulfillment, address } = parsed.data;
  const ship = fulfillment === "ship";
  if (ship && address.length < 10) return { error: "Enter the full shipping address." };
  const jokerChoice = favorite === "joker" ? (await jokerTimer(eventId, user.id))?.choice ?? "kept" : null;

  const [event] = await db.select({ slug: s.events.slug }).from(s.events).where(eq(s.events.id, eventId)).limit(1);
  if (!event) return { error: "That event no longer exists." };
  let code = "";
  try {
    await db.transaction(async (tx) => {
      const [taken] = await tx.select({ id: s.registrations.id }).from(s.registrations)
        .where(and(eq(s.registrations.eventId, eventId), eq(s.registrations.userId, user.id))).limit(1);
      if (taken) throw new RegistrationError("You're already registered for this event.");
      const [card] = await tx.select({ id: s.cards.id, code: s.cards.code }).from(s.cards)
        .where(and(eq(s.cards.eventId, eventId), eq(s.cards.design, favorite),
          sql`not exists (select 1 from ${s.registrations} where ${s.registrations.cardId} = ${s.cards.id})`))
        .limit(1).for("update", { skipLocked: true });
      if (!card) throw new RegistrationError(`The last ${CARD_DESIGNS[favorite].name} was just claimed. Go back and pick another card.`);
      code = card.code;
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
  return { done: { design: favorite, jokerChoice, ship, slug: event.slug, code, qr: await checkInQr(code) } };
}

// Photo IDs come from the page; anything that isn't one is ignored rather than queried.
const isId = (v: string) => /^[0-9a-f-]{36}$/i.test(v);

export async function toggleLike(photoId: string, eventSlug: string) {
  if (!isId(photoId)) return;
  const user = await getUser();
  if (!user) redirect(`/signin?next=${encodeURIComponent(`/events/${eventSlug}/photos`)}`);
  const where = and(eq(s.photoLikes.photoId, photoId), eq(s.photoLikes.userId, user.id));
  const [existing] = await db.select().from(s.photoLikes).where(where).limit(1);
  if (existing) await db.delete(s.photoLikes).where(where);
  else await db.insert(s.photoLikes).values({ photoId, userId: user.id }).onConflictDoNothing();
  revalidatePath(`/events/${eventSlug}/photos`);
  revalidatePath("/posts");
}

// Moderating the wall (the client: "admin rights to remove", and "the community of users the
// ability to thumbs down an image to remove as well"). This many thumbs-downs from different
// people take a photo off the wall; admins can restore it from /admin/photos.
const REMOVE_AFTER_DOWNVOTES = 5;

function refreshWalls(eventSlug: string) {
  revalidatePath(`/events/${eventSlug}/photos`);
  revalidatePath(`/events/${eventSlug}`);
  revalidatePath("/posts");
}

export async function toggleDownvote(photoId: string, eventSlug: string) {
  if (!isId(photoId)) return;
  const user = await getUser();
  if (!user) redirect(`/signin?next=${encodeURIComponent("/posts")}`);
  const [photo] = await db.select({ userId: s.photos.userId }).from(s.photos).where(eq(s.photos.id, photoId)).limit(1);
  if (!photo || photo.userId === user.id) return;
  const where = and(eq(s.photoDownvotes.photoId, photoId), eq(s.photoDownvotes.userId, user.id));
  const [existing] = await db.select().from(s.photoDownvotes).where(where).limit(1);
  if (existing) {
    await db.delete(s.photoDownvotes).where(where);
  } else {
    await db.insert(s.photoDownvotes).values({ photoId, userId: user.id }).onConflictDoNothing();
    const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(s.photoDownvotes).where(eq(s.photoDownvotes.photoId, photoId));
    if (n >= REMOVE_AFTER_DOWNVOTES) {
      await db.update(s.photos).set({ removedAt: new Date(), removedBy: "community" })
        .where(and(eq(s.photos.id, photoId), isNull(s.photos.removedAt)));
    }
  }
  refreshWalls(eventSlug);
}

export async function removePhoto(photoId: string, eventSlug: string) {
  if (!isId(photoId)) return;
  const user = await getUser();
  if (user?.role !== "admin") return;
  await db.update(s.photos).set({ removedAt: new Date(), removedBy: "admin" })
    .where(and(eq(s.photos.id, photoId), isNull(s.photos.removedAt)));
  refreshWalls(eventSlug);
}

// Puts a photo back on the wall and clears its thumbs-downs, so one more doesn't take it
// straight back off.
export async function restorePhoto(form: FormData) {
  const user = await getUser();
  if (user?.role !== "admin") return;
  const photoId = String(form.get("photoId") ?? "");
  if (!isId(photoId)) return;
  const [photo] = await db.update(s.photos).set({ removedAt: null, removedBy: null })
    .where(eq(s.photos.id, photoId)).returning({ eventId: s.photos.eventId });
  if (!photo) return;
  await db.delete(s.photoDownvotes).where(eq(s.photoDownvotes.photoId, photoId));
  const [event] = await db.select({ slug: s.events.slug }).from(s.events).where(eq(s.events.id, photo.eventId)).limit(1);
  refreshWalls(event.slug);
  revalidatePath("/admin/photos");
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

// At the door: staff (admins) mark a guest's collector card as handed over.
export async function checkInCard(form: FormData) {
  const user = await getUser();
  if (user?.role !== "admin") return;
  const code = String(form.get("code") ?? "").trim().toUpperCase();
  const [card] = await db.select({ id: s.cards.id }).from(s.cards).where(eq(s.cards.code, code)).limit(1);
  if (!card) return;
  await db.update(s.registrations).set({ checkedInAt: new Date() })
    .where(and(eq(s.registrations.cardId, card.id), isNull(s.registrations.checkedInAt)));
  revalidatePath("/admin/check-in");
  redirect(`/admin/check-in?code=${encodeURIComponent(code)}`);
}
