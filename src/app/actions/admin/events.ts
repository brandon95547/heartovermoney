"use server";

// Events: their details, terms, sponsors and documents; the food and drink menu.
import { and, eq, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db, schema as s } from "@/db";
import type { AdminState } from "@/components/admin-form";
import { AdminError, adminActor, audit, slugify } from "@/lib/admin";
import { cents, isUuid, text, whole } from "@/lib/admin-forms";
import { attempt, refreshSite } from "@/lib/admin-run";
import { fromEasternInput } from "@/lib/eastern";

// "Name | https://…" per line; a document without an address shows as "shared soon".
function documents(v: string | null) {
  return (v ?? "").split("\n").map((l) => l.trim()).filter(Boolean).map((line) => {
    const [name, address = ""] = line.split("|").map((x) => x.trim());
    if (address && !/^(https?:\/\/|\/)/.test(address)) throw new AdminError(`The address for “${name}” must start with https:// or /.`);
    return { name: name.slice(0, 120), url: address };
  });
}

export async function saveEvent(_: AdminState, form: FormData): Promise<AdminState> {
  let createdId: string | null = null;
  const result = await attempt(async () => {
    const admin = await adminActor();
    const title = text(form, "title", 120);
    const cityId = form.get("cityId");
    const startsAt = fromEasternInput(form.get("startsAt"));
    const venue = text(form, "venue", 120);
    const description = text(form, "description", 4000);
    const costCents = cents(form, "cost");
    const charityName = text(form, "charityName", 120);
    const charityPercent = whole(form, "charityPercent", 0);
    const hostName = text(form, "hostName", 120);
    if (!title || !isUuid(cityId) || !startsAt || !venue || !description || costCents == null || !charityName || charityPercent == null || charityPercent > 100 || !hostName) {
      throw new AdminError("Fill in the title, city, start, venue, description, cost goal, charity, its share (0–100%) and host.");
    }
    const slug = slugify(text(form, "slug", 60) ?? `${title}-${startsAt.getFullYear()}`);
    const sponsors = (text(form, "sponsors", 2000) ?? "").split("\n").map((l) => l.trim()).filter(Boolean).map((name) => ({ name: name.slice(0, 80) }));
    const fields = {
      title, slug, cityId, startsAt, venue, description, costCents, charityName, charityPercent, hostName, sponsors,
      documents: documents(text(form, "documents", 4000)), terms: text(form, "terms", 6000) ?? "",
    };
    const id = form.get("id");
    if (isUuid(id)) {
      await db.update(s.events).set(fields).where(eq(s.events.id, id));
      await audit(admin.id, "edited the event", title);
      refreshSite();
      return { ok: "Saved." };
    }
    const [row] = await db.insert(s.events).values(fields).returning({ id: s.events.id });
    await audit(admin.id, "added the event", title);
    refreshSite();
    createdId = row.id;
    return { ok: "Added." };
  });
  if (createdId) redirect(`/admin/events/${createdId}`);
  return result;
}

// An event can be deleted only before anything has happened at it.
export async function deleteEvent(_: AdminState, form: FormData): Promise<AdminState> {
  const result = await attempt(async () => {
    const admin = await adminActor();
    const id = form.get("id");
    if (!isUuid(id)) throw new AdminError("That event no longer exists.");
    const used = await Promise.all([s.orders, s.cards, s.lots, s.photos].map((table) =>
      db.select({ n: sql<number>`count(*)::int` }).from(table).where(eq(table.eventId, id))));
    if (used.some(([{ n }]) => n)) throw new AdminError("This event has cards, lots, photos or sales, so it stays on record.");
    const [event] = await db.select({ title: s.events.title }).from(s.events).where(eq(s.events.id, id)).limit(1);
    await db.delete(s.menuItems).where(eq(s.menuItems.eventId, id));
    await db.delete(s.events).where(eq(s.events.id, id));
    await audit(admin.id, "deleted the event", event?.title ?? id);
    refreshSite();
    return { ok: "Deleted." };
  });
  if (result?.ok) redirect("/admin/events");
  return result;
}

export async function addMenuItem(_: AdminState, form: FormData): Promise<AdminState> {
  return attempt(async () => {
    const admin = await adminActor();
    const eventId = form.get("eventId");
    const name = text(form, "name", 80);
    const category = text(form, "category", 40) ?? "Food";
    const priceCents = cents(form, "price");
    if (!isUuid(eventId) || !name || priceCents == null) throw new AdminError("Give the item a name and a price.");
    await db.insert(s.menuItems).values({ eventId, name, category, priceCents });
    await audit(admin.id, "added to the menu", name);
    refreshSite();
    return { ok: `Added ${name}.` };
  });
}

// A menu item someone has ordered stays (their order points to it); it can be renamed instead.
export async function removeMenuItem(_: AdminState, form: FormData): Promise<AdminState> {
  return attempt(async () => {
    const admin = await adminActor();
    const id = form.get("id");
    if (!isUuid(id)) throw new AdminError("That item no longer exists.");
    const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(s.orderItems).where(eq(s.orderItems.menuItemId, id));
    if (n) throw new AdminError("Someone has ordered this, so it stays on the order record.");
    const [item] = await db.delete(s.menuItems).where(and(eq(s.menuItems.id, id))).returning({ name: s.menuItems.name });
    await audit(admin.id, "took off the menu", item?.name ?? id);
    refreshSite();
    return { ok: "Removed." };
  });
}
