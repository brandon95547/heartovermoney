"use server";

// Orders: handing them over or shipping them, and refunds (test mode records the refund; with
// card payments it will go back through the payment provider). A refund takes the order off
// the scoreboard, retires its numbered pieces (their numbers are never reused) and puts a
// bought-outright auction lot back up.
import { and, eq, isNull } from "drizzle-orm";
import { db, schema as s } from "@/db";
import type { AdminState } from "@/components/admin-form";
import { AdminError, adminActor, audit } from "@/lib/admin";
import { isUuid, text } from "@/lib/admin-forms";
import { attempt, refreshSite } from "@/lib/admin-run";
import { money } from "@/lib/format";

export async function fulfillOrder(_: AdminState, form: FormData): Promise<AdminState> {
  return attempt(async () => {
    const admin = await adminActor();
    const id = form.get("id");
    if (!isUuid(id)) throw new AdminError("That order no longer exists.");
    const tracking = text(form, "tracking", 80);
    const [o] = await db.update(s.orders).set({ fulfilledAt: new Date(), trackingNumber: tracking })
      .where(and(eq(s.orders.id, id), eq(s.orders.status, "paid"), isNull(s.orders.fulfilledAt)))
      .returning({ fulfillment: s.orders.fulfillment, totalCents: s.orders.totalCents });
    if (!o) throw new AdminError("This order was already handed over, shipped or refunded.");
    await audit(admin.id, o.fulfillment === "ship" ? "shipped the order" : "handed over the order", id.slice(0, 8), tracking ? `tracking ${tracking}` : "");
    refreshSite();
    return { ok: o.fulfillment === "ship" ? "Marked shipped." : "Marked handed over." };
  });
}

export async function refundOrder(_: AdminState, form: FormData): Promise<AdminState> {
  return attempt(async () => {
    const admin = await adminActor();
    const id = form.get("id");
    const reason = text(form, "reason", 300);
    if (!isUuid(id)) throw new AdminError("That order no longer exists.");
    if (!reason) throw new AdminError("Say why it's refunded, for the record.");
    const total = await db.transaction(async (tx) => {
      const [o] = await tx.update(s.orders).set({ status: "refunded", refundedAt: new Date() })
        .where(and(eq(s.orders.id, id), eq(s.orders.status, "paid"))).returning({ totalCents: s.orders.totalCents });
      if (!o) throw new AdminError("This order isn't paid, or was already refunded.");
      await tx.update(s.editions).set({ status: "void", statusNote: `Refunded: ${reason}` }).where(eq(s.editions.orderId, id));
      const lots = await tx.select({ lotId: s.orderItems.lotId }).from(s.orderItems).where(eq(s.orderItems.orderId, id));
      for (const { lotId } of lots) {
        if (lotId) await tx.update(s.lots).set({ status: "open", buyerId: null, soldCents: null }).where(eq(s.lots.id, lotId));
      }
      return o.totalCents;
    });
    await audit(admin.id, "refunded the order", id.slice(0, 8), `${money(total, { cents: true })} · ${reason}`);
    refreshSite();
    return { ok: "Refunded." };
  });
}
