"use server";

// Event actions: like a photo, post one to the photo wall, and order food and drink.
import fs from "node:fs/promises";
import crypto from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db, schema as s } from "@/db";
import { getUser } from "@/lib/dal";
import { UPLOAD_DIR, uploadPath } from "@/lib/uploads";

export type EventActionState = { error?: string } | undefined;

export async function toggleLike(photoId: string, eventSlug: string) {
  const user = await getUser();
  if (!user) redirect(`/signin?next=${encodeURIComponent(`/events/${eventSlug}/photos`)}`);
  const where = and(eq(s.photoLikes.photoId, photoId), eq(s.photoLikes.userId, user.id));
  const [existing] = await db.select().from(s.photoLikes).where(where).limit(1);
  if (existing) await db.delete(s.photoLikes).where(where);
  else await db.insert(s.photoLikes).values({ photoId, userId: user.id }).onConflictDoNothing();
  revalidatePath(`/events/${eventSlug}/photos`);
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
