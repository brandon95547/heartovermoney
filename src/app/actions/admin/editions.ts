"use server";

// Numbered pieces: recording a sale made in person (the next number, its certificate and
// ownership record, and an order so the scoreboard counts it), moving a piece to a new owner,
// and retiring one (void or damaged). Numbers are never reused.
import { eq, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db, schema as s } from "@/db";
import type { AdminState } from "@/components/admin-form";
import { AdminError, adminActor, audit } from "@/lib/admin";
import { cents, isUuid, text } from "@/lib/admin-forms";
import { attempt, refreshSite } from "@/lib/admin-run";
import { certificateCode } from "@/lib/certificates";

async function userByUsername(username: string | null) {
  if (!username) return null;
  const [u] = await db.select({ id: s.users.id, username: s.users.username }).from(s.users)
    .where(sql`lower(${s.users.username}) = ${username.replace(/^@/, "").toLowerCase()}`).limit(1);
  return u ?? null;
}

export async function issueEdition(_: AdminState, form: FormData): Promise<AdminState> {
  let editionId: string | null = null;
  const result = await attempt(async () => {
    const admin = await adminActor();
    const pieceId = form.get("pieceId");
    const owner = await userByUsername(text(form, "owner", 40));
    if (!isUuid(pieceId)) throw new AdminError("Choose the piece.");
    if (!owner) throw new AdminError("No account has that username. The collector needs an account first.");
    const eventId = form.get("eventId");
    const note = text(form, "note", 300) ?? "";
    editionId = await db.transaction(async (tx) => {
      // Locks the piece, so two sales at once can't take the same number.
      await tx.execute(sql`select id from ${s.artworks} where id = ${pieceId} for update`);
      const [piece] = await tx.select({
        id: s.artworks.id, title: s.artworks.title, editionSize: s.artworks.editionSize, priceCents: s.artworks.priceCents,
        prefix: s.artworks.certificatePrefix, city: s.cities.name, state: s.cities.state,
      }).from(s.artworks).innerJoin(s.cities, eq(s.cities.id, s.artworks.cityId)).where(eq(s.artworks.id, pieceId)).limit(1);
      if (!piece) throw new AdminError("That piece no longer exists.");
      const [{ n }] = await tx.select({ n: sql<number>`count(*)::int` }).from(s.editions).where(eq(s.editions.artworkId, piece.id));
      if (n >= piece.editionSize) throw new AdminError(`All ${piece.editionSize} of “${piece.title}” are issued. The edition is complete.`);
      const price = cents(form, "price") ?? piece.priceCents;
      const now = new Date();
      const [order] = await tx.insert(s.orders).values({
        userId: owner.id, kind: "art", status: "paid", totalCents: price, eventId: isUuid(eventId) ? eventId : null,
        fulfillment: "pickup", fulfilledAt: now,
      }).returning({ id: s.orders.id });
      await tx.insert(s.orderItems).values({ orderId: order.id, label: piece.title, artworkId: piece.id, unitPriceCents: price });
      const number = n + 1;
      const [edition] = await tx.insert(s.editions).values({
        artworkId: piece.id, number, ownerId: owner.id, orderId: order.id, issuedAt: now,
        certificateCode: certificateCode({ title: piece.title, number, editionSize: piece.editionSize, city: piece.city, state: piece.state, issuedAt: now, artistPrefix: piece.prefix }),
      }).returning({ id: s.editions.id });
      await tx.insert(s.provenance).values({ editionId: edition.id, kind: "issued", toUserId: owner.id, at: now });
      await audit(admin.id, "recorded an in-person sale of", `${piece.title} No. ${number}`, `to @${owner.username}${note ? ` · ${note}` : ""}`);
      return edition.id;
    });
    refreshSite();
    return { ok: "Issued." };
  });
  if (editionId) redirect(`/admin/editions/${editionId}`);
  return result;
}

export async function transferEdition(_: AdminState, form: FormData): Promise<AdminState> {
  return attempt(async () => {
    const admin = await adminActor();
    const id = form.get("id");
    const to = await userByUsername(text(form, "to", 40));
    const reason = text(form, "reason", 300);
    if (!isUuid(id)) throw new AdminError("That piece no longer exists.");
    if (!to) throw new AdminError("No account has that username.");
    if (!reason) throw new AdminError("Say why it changes hands (for example, sold to them, or a gift).");
    const [edition] = await db.select({ ownerId: s.editions.ownerId, number: s.editions.number, status: s.editions.status, title: s.artworks.title })
      .from(s.editions).innerJoin(s.artworks, eq(s.artworks.id, s.editions.artworkId)).where(eq(s.editions.id, id)).limit(1);
    if (!edition) throw new AdminError("That piece no longer exists.");
    if (edition.status !== "active") throw new AdminError("A retired piece can't change hands.");
    if (edition.ownerId === to.id) throw new AdminError(`@${to.username} already owns it.`);
    await db.transaction(async (tx) => {
      await tx.update(s.editions).set({ ownerId: to.id }).where(eq(s.editions.id, id));
      await tx.insert(s.provenance).values({ editionId: id, kind: "transferred", fromUserId: edition.ownerId, toUserId: to.id });
    });
    await audit(admin.id, "moved", `${edition.title} No. ${edition.number}`, `to @${to.username} · ${reason}`);
    refreshSite();
    return { ok: `Now owned by @${to.username}.` };
  });
}

export async function setEditionStatus(_: AdminState, form: FormData): Promise<AdminState> {
  return attempt(async () => {
    const admin = await adminActor();
    const id = form.get("id");
    const status = (["active", "void", "damaged"] as const).find((v) => v === form.get("status"));
    const note = text(form, "note", 300);
    if (!isUuid(id) || !status) throw new AdminError("Choose a status.");
    if (status !== "active" && !note) throw new AdminError("Say why, for the record.");
    const [edition] = await db.update(s.editions).set({ status, statusNote: status === "active" ? null : note })
      .where(eq(s.editions.id, id)).returning({ number: s.editions.number, artworkId: s.editions.artworkId });
    if (!edition) throw new AdminError("That piece no longer exists.");
    const [piece] = await db.select({ title: s.artworks.title }).from(s.artworks).where(eq(s.artworks.id, edition.artworkId)).limit(1);
    await audit(admin.id, status === "active" ? "restored" : `marked ${status}`, `${piece?.title} No. ${edition.number}`, note ?? "");
    refreshSite();
    return { ok: "Saved." };
  });
}
