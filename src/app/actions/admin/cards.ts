"use server";

// Collector cards: adding a run of new codes or importing printed ones (duplicates are skipped
// and reported), removing an unclaimed card, marking a mailed card sent, and cancelling a
// registration (its card goes back into the deck).
import { and, eq, inArray, sql } from "drizzle-orm";
import { db, schema as s } from "@/db";
import type { AdminState } from "@/components/admin-form";
import { AdminError, adminActor, audit } from "@/lib/admin";
import { isUuid, text, whole } from "@/lib/admin-forms";
import { attempt, refreshSite } from "@/lib/admin-run";

const DESIGNS = ["joker", "queen", "rabbit"] as const;
type Design = (typeof DESIGNS)[number];

async function eventTitle(eventId: string) {
  const [e] = await db.select({ title: s.events.title }).from(s.events).where(eq(s.events.id, eventId)).limit(1);
  if (!e) throw new AdminError("That event no longer exists.");
  return e.title;
}

// Inserts the cards whose codes are new; returns how many were added and the codes skipped.
async function addCards(eventId: string, cards: { code: string; design: Design }[]) {
  const codes = cards.map((c) => c.code);
  const taken = new Set((await db.select({ code: s.cards.code }).from(s.cards).where(inArray(s.cards.code, codes))).map((r) => r.code));
  const seen = new Set<string>();
  const fresh = cards.filter((c) => !taken.has(c.code) && !seen.has(c.code) && seen.add(c.code));
  if (fresh.length) await db.insert(s.cards).values(fresh.map((c) => ({ eventId, ...c })));
  return { added: fresh.length, skipped: cards.filter((c) => !fresh.includes(c)).map((c) => c.code) };
}

const report = (added: number, skipped: string[]) =>
  `Added ${added} card${added === 1 ? "" : "s"}.${skipped.length ? ` Skipped ${skipped.length} already in use: ${skipped.slice(0, 8).join(", ")}${skipped.length > 8 ? "…" : ""}.` : ""}`;

// A run of cards with codes PREFIX-0001 on, continuing after the highest number already used.
export async function addCardRun(_: AdminState, form: FormData): Promise<AdminState> {
  return attempt(async () => {
    const admin = await adminActor();
    const eventId = form.get("eventId");
    const design = DESIGNS.find((d) => d === form.get("design"));
    const count = whole(form, "count", 1);
    const prefix = (text(form, "prefix", 10) ?? "HOM").toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (!isUuid(eventId) || !design || !count || count > 1000 || !prefix) throw new AdminError("Choose the design and how many (up to 1,000).");
    const title = await eventTitle(eventId);
    const [{ top }] = await db.select({ top: sql<number | null>`max(substring(${s.cards.code} from '[0-9]+$')::int)` })
      .from(s.cards).where(sql`${s.cards.code} ~ ${`^${prefix}-[0-9]+$`}`);
    const start = (top ?? 0) + 1;
    const cards = Array.from({ length: count }, (_, i) => ({ code: `${prefix}-${String(start + i).padStart(4, "0")}`, design }));
    const { added, skipped } = await addCards(eventId, cards);
    await audit(admin.id, `added ${added} ${design} cards to`, title, `${cards[0].code} to ${cards.at(-1)!.code}`);
    refreshSite();
    return { ok: report(added, skipped) };
  });
}

// Printed cards: one per line, "CODE, design" (design is joker, queen or rabbit).
export async function importCards(_: AdminState, form: FormData): Promise<AdminState> {
  return attempt(async () => {
    const admin = await adminActor();
    const eventId = form.get("eventId");
    if (!isUuid(eventId)) throw new AdminError("Choose the event.");
    const lines = (text(form, "codes", 100_000) ?? "").split("\n").map((l) => l.trim()).filter(Boolean);
    if (!lines.length) throw new AdminError("Paste the codes, one per line: CODE, design.");
    if (lines.length > 2000) throw new AdminError("Import up to 2,000 cards at a time.");
    const cards = lines.map((line, i) => {
      const [code, design] = line.split(/[,\t;]/).map((x) => x.trim());
      const d = DESIGNS.find((x) => x === design?.toLowerCase());
      if (!code || !/^[A-Za-z0-9-]{3,40}$/.test(code) || !d) throw new AdminError(`Line ${i + 1} (“${line.slice(0, 40)}”) should be CODE, joker / queen / rabbit.`);
      return { code: code.toUpperCase(), design: d };
    });
    const title = await eventTitle(eventId);
    const { added, skipped } = await addCards(eventId, cards);
    await audit(admin.id, `imported ${added} cards to`, title, skipped.length ? `${skipped.length} duplicates skipped` : "");
    refreshSite();
    return { ok: report(added, skipped) };
  });
}

export async function removeCard(_: AdminState, form: FormData): Promise<AdminState> {
  return attempt(async () => {
    const admin = await adminActor();
    const id = form.get("id");
    if (!isUuid(id)) throw new AdminError("That card no longer exists.");
    const [claimed] = await db.select({ id: s.registrations.id }).from(s.registrations).where(eq(s.registrations.cardId, id)).limit(1);
    if (claimed) throw new AdminError("Someone has registered this card. Cancel the registration first.");
    const [card] = await db.delete(s.cards).where(eq(s.cards.id, id)).returning({ code: s.cards.code });
    await audit(admin.id, "removed the card", card?.code ?? id);
    refreshSite();
    return { ok: "Removed." };
  });
}

export async function markCardMailed(_: AdminState, form: FormData): Promise<AdminState> {
  return attempt(async () => {
    const admin = await adminActor();
    const id = form.get("registrationId");
    if (!isUuid(id)) throw new AdminError("That registration no longer exists.");
    const [r] = await db.update(s.registrations).set({ shippedAt: new Date() })
      .where(and(eq(s.registrations.id, id), eq(s.registrations.fulfillment, "ship"))).returning({ cardId: s.registrations.cardId });
    if (!r) throw new AdminError("Only a card being mailed can be marked sent.");
    const [card] = await db.select({ code: s.cards.code }).from(s.cards).where(eq(s.cards.id, r.cardId)).limit(1);
    await audit(admin.id, "mailed the card", card?.code ?? "");
    refreshSite();
    return { ok: "Marked mailed." };
  });
}

export async function cancelRegistration(_: AdminState, form: FormData): Promise<AdminState> {
  return attempt(async () => {
    const admin = await adminActor();
    const id = form.get("registrationId");
    const reason = text(form, "reason", 300);
    if (!isUuid(id)) throw new AdminError("That registration no longer exists.");
    const [r] = await db.select({ cardId: s.registrations.cardId, eventId: s.registrations.eventId, userId: s.registrations.userId, checkedInAt: s.registrations.checkedInAt })
      .from(s.registrations).where(eq(s.registrations.id, id)).limit(1);
    if (!r) throw new AdminError("That registration no longer exists.");
    if (r.checkedInAt) throw new AdminError("This card was already handed over at the door.");
    const [[card], [user]] = await Promise.all([
      db.select({ code: s.cards.code }).from(s.cards).where(eq(s.cards.id, r.cardId)).limit(1),
      db.select({ username: s.users.username }).from(s.users).where(eq(s.users.id, r.userId)).limit(1),
    ]);
    await db.transaction(async (tx) => {
      await tx.delete(s.registrations).where(eq(s.registrations.id, id));
      // Their Joker clock goes too, so if they register again it's a fresh draw.
      await tx.delete(s.jokerTimers).where(and(eq(s.jokerTimers.eventId, r.eventId), eq(s.jokerTimers.userId, r.userId)));
    });
    await audit(admin.id, "cancelled the registration of", `@${user?.username} (${card?.code})`, reason ?? "");
    refreshSite();
    return { ok: `Cancelled. ${card?.code} is back in the deck.` };
  });
}
