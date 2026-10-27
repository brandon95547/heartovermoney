"use server";

// Auction lots: scheduling them, removing a bid that shouldn't stand (a winner who backs out,
// a mistake), and closing a lot: sold to the highest bid still standing, or closed unsold.
import { desc, eq, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db, schema as s } from "@/db";
import type { AdminState } from "@/components/admin-form";
import { AdminError, adminActor, audit } from "@/lib/admin";
import { cents, checked, isUuid, text } from "@/lib/admin-forms";
import { attempt, refreshSite, savePictures } from "@/lib/admin-run";
import { fromEasternInput } from "@/lib/eastern";
import { money } from "@/lib/format";

export async function saveLot(_: AdminState, form: FormData): Promise<AdminState> {
  let createdId: string | null = null;
  const result = await attempt(async () => {
    const admin = await adminActor();
    const eventId = form.get("eventId");
    const title = text(form, "title", 120);
    const maker = text(form, "maker", 120);
    const description = text(form, "description", 4000);
    const quantityLabel = text(form, "quantityLabel", 80) ?? "1 piece";
    const retailValueCents = cents(form, "retail");
    const startingBidCents = cents(form, "startingBid");
    const buyNowCents = cents(form, "buyNow");
    const auctionStartsAt = fromEasternInput(form.get("startsAt"));
    const auctionEndsAt = fromEasternInput(form.get("endsAt"));
    if (!isUuid(eventId) || !title || !maker || !description || retailValueCents == null || startingBidCents == null || !auctionStartsAt || !auctionEndsAt) {
      throw new AdminError("Fill in the event, title, maker, description, retail value, starting bid and the auction's start and end.");
    }
    if (auctionEndsAt <= auctionStartsAt) throw new AdminError("The auction has to end after it starts.");
    const added = await savePictures(form);
    const remove = new Set(form.getAll("removeImage").map(String));
    const fields = { eventId, title, maker, description, quantityLabel, retailValueCents, startingBidCents, buyNowCents, auctionStartsAt, auctionEndsAt, isArt: checked(form, "isArt") };
    const id = form.get("id");
    if (isUuid(id)) {
      const [current] = await db.select({ images: s.lots.images, status: s.lots.status }).from(s.lots).where(eq(s.lots.id, id)).limit(1);
      if (!current) throw new AdminError("That lot no longer exists.");
      if (current.status === "sold") throw new AdminError("This lot is sold; its details stay as they were.");
      const images = [...current.images.filter((i) => !remove.has(i)), ...added];
      if (!images.length) throw new AdminError("Keep at least one picture.");
      await db.update(s.lots).set({ ...fields, images }).where(eq(s.lots.id, id));
      await audit(admin.id, "edited the lot", title);
      refreshSite();
      return { ok: "Saved." };
    }
    if (!added.length) throw new AdminError("Add at least one picture.");
    const [row] = await db.insert(s.lots).values({ ...fields, images: added }).returning({ id: s.lots.id });
    await audit(admin.id, "added the lot", title);
    refreshSite();
    createdId = row.id;
    return { ok: "Added." };
  });
  if (createdId) redirect(`/admin/auctions/${createdId}`);
  return result;
}

export async function removeBid(_: AdminState, form: FormData): Promise<AdminState> {
  return attempt(async () => {
    const admin = await adminActor();
    const id = form.get("bidId");
    const reason = text(form, "reason", 300);
    if (!isUuid(id)) throw new AdminError("That bid no longer exists.");
    if (!reason) throw new AdminError("Say why the bid is removed, for the record.");
    const [bid] = await db.select({ lotId: s.bids.lotId, amountCents: s.bids.amountCents, username: s.users.username, status: s.lots.status, title: s.lots.title })
      .from(s.bids).innerJoin(s.users, eq(s.users.id, s.bids.userId)).innerJoin(s.lots, eq(s.lots.id, s.bids.lotId)).where(eq(s.bids.id, id)).limit(1);
    if (!bid) throw new AdminError("That bid no longer exists.");
    if (bid.status !== "open") throw new AdminError("The lot is closed; its bids stay on record.");
    await db.delete(s.bids).where(eq(s.bids.id, id));
    await audit(admin.id, `removed @${bid.username}'s ${money(bid.amountCents)} bid on`, bid.title, reason);
    refreshSite();
    return { ok: "Removed." };
  });
}

// Sells the lot to the highest bid (an order for the winner, paid in test mode, counted on the
// event's scoreboard), or closes it unsold when there are no bids.
export async function closeLot(_: AdminState, form: FormData): Promise<AdminState> {
  return attempt(async () => {
    const admin = await adminActor();
    const id = form.get("id");
    if (!isUuid(id)) throw new AdminError("That lot no longer exists.");
    const message = await db.transaction(async (tx) => {
      await tx.execute(sql`select id from ${s.lots} where id = ${id} for update`);
      const [lot] = await tx.select().from(s.lots).where(eq(s.lots.id, id)).limit(1);
      if (!lot || lot.status !== "open") throw new AdminError("This lot is already closed.");
      const [top] = await tx.select({ userId: s.bids.userId, amountCents: s.bids.amountCents, username: s.users.username })
        .from(s.bids).innerJoin(s.users, eq(s.users.id, s.bids.userId)).where(eq(s.bids.lotId, id))
        .orderBy(desc(s.bids.amountCents), s.bids.createdAt).limit(1);
      if (!top) {
        await tx.update(s.lots).set({ status: "closed" }).where(eq(s.lots.id, id));
        await audit(admin.id, "closed unsold", lot.title);
        return "Closed with no sale.";
      }
      const [order] = await tx.insert(s.orders).values({
        userId: top.userId, kind: "lot", status: "paid", totalCents: top.amountCents, eventId: lot.eventId, fulfillment: "pickup",
      }).returning({ id: s.orders.id });
      await tx.insert(s.orderItems).values({ orderId: order.id, label: lot.title, lotId: lot.id, unitPriceCents: top.amountCents });
      await tx.update(s.lots).set({ status: "sold", buyerId: top.userId, soldCents: top.amountCents }).where(eq(s.lots.id, id));
      await audit(admin.id, `sold to @${top.username} for ${money(top.amountCents)}`, lot.title);
      return `Sold to @${top.username} for ${money(top.amountCents)}.`;
    });
    refreshSite();
    return { ok: message };
  });
}

export async function deleteLot(_: AdminState, form: FormData): Promise<AdminState> {
  const result = await attempt(async () => {
    const admin = await adminActor();
    const id = form.get("id");
    if (!isUuid(id)) throw new AdminError("That lot no longer exists.");
    const [lot] = await db.select({ title: s.lots.title, status: s.lots.status, bids: sql<number>`(select count(*)::int from ${s.bids} where ${s.bids.lotId} = ${s.lots.id})` })
      .from(s.lots).where(eq(s.lots.id, id)).limit(1);
    if (!lot) throw new AdminError("That lot no longer exists.");
    if (lot.status === "sold" || lot.bids) throw new AdminError("This lot has bids or a sale, so it stays on record. Close it instead.");
    await db.delete(s.lots).where(eq(s.lots.id, id));
    await audit(admin.id, "deleted the lot", lot.title);
    refreshSite();
    return { ok: "Deleted." };
  });
  if (result?.ok) redirect("/admin/auctions");
  return result;
}
