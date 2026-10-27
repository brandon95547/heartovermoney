// Order confirmation: what was bought, and the certificate of each numbered piece.
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { and, asc, eq } from "drizzle-orm";
import { connection } from "next/server";
import { Check } from "lucide-react";
import { db, schema as s } from "@/db";
import { PageHeader, Skeleton, buttonClass } from "@/components/ui";
import { requireUser } from "@/lib/dal";
import { certificatePath } from "@/lib/certificates";
import { money } from "@/lib/format";

export const metadata: Metadata = { title: "Order" };

export default function OrderPage(props: PageProps<"/orders/[id]">) {
  return (
    <main>
      <PageHeader title="Order" back="/profile" />
      <Suspense fallback={<Skeleton className="m-5 h-64" />}><Order params={props.params} /></Suspense>
    </main>
  );
}

async function Order({ params }: { params: PageProps<"/orders/[id]">["params"] }) {
  const { id } = await params;
  const user = await requireUser(`/orders/${id}`);
  await connection();
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const [order] = await db.select().from(s.orders).where(and(eq(s.orders.id, id), eq(s.orders.userId, user.id))).limit(1);
  if (!order) notFound();
  const [items, editions, [event]] = await Promise.all([
    db.select().from(s.orderItems).where(eq(s.orderItems.orderId, id)),
    db.select({ code: s.editions.certificateCode, number: s.editions.number, title: s.artworks.title, size: s.artworks.editionSize })
      .from(s.editions).innerJoin(s.artworks, eq(s.artworks.id, s.editions.artworkId)).where(eq(s.editions.orderId, id))
      .orderBy(asc(s.artworks.title), asc(s.editions.number)),
    order.eventId ? db.select({ slug: s.events.slug }).from(s.events).where(eq(s.events.id, order.eventId)).limit(1) : [],
  ]);
  const pickup = order.kind === "food" ? "Pick it up at the bar."
    : order.kind === "ticket" ? "Show your name at the door."
    : "Claim it at the door of the event.";

  return (
    <div className="space-y-6 p-5">
      <div className="flex flex-col items-center gap-2 py-4 text-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-go text-white"><Check /></span>
        <h2 className="text-xl font-bold">Thank you</h2>
        <p className="text-sm text-muted">Each purchase helps send the next outreach.</p>
      </div>
      <ul className="divide-y divide-line rounded-md border border-line">
        {items.map((i) => (
          <li key={i.id} className="flex justify-between p-4 text-sm">
            <span>{i.quantity > 1 ? `(${i.quantity}) ` : ""}{i.label}</span>
            <span className="font-semibold">{money(i.unitPriceCents * i.quantity)}</span>
          </li>
        ))}
        <li className="flex justify-between p-4 font-bold"><span>Total</span><span>{money(order.totalCents, { cents: true })}</span></li>
      </ul>
      {order.status === "refunded" ? (
        <p className="rounded-md bg-alert/10 p-3 text-sm text-alert">This order was refunded.</p>
      ) : (
        <p className="text-sm">
          {order.fulfillment === "ship"
            ? `${order.fulfilledAt ? "Shipped" : "Shipping"} to: ${order.shipAddress}${order.trackingNumber ? ` · Tracking ${order.trackingNumber}` : ""}`
            : order.fulfilledAt ? "Handed over. Thank you." : pickup}
        </p>
      )}
      {editions.length > 0 && (
        <section className="space-y-2">
          <h3 className="font-semibold">Your certificates of authenticity</h3>
          {editions.map((e) => (
            <Link key={e.code} href={certificatePath(e.code)} className="block rounded-md bg-fog p-4 text-sm">
              <span className="font-semibold">{e.title}</span> · No. {e.number} of {e.size}
              <span className="mt-1 block break-all font-mono text-[11px] text-muted">{e.code}</span>
            </Link>
          ))}
        </section>
      )}
      {order.kind === "art" ? <Link href="/vault" className={buttonClass("outline", "w-full")}>Open your Vault</Link>
        : event ? <Link href={`/events/${event.slug}`} className={buttonClass("outline", "w-full")}>Back to the event</Link>
        : <Link href="/profile#orders" className={buttonClass("outline", "w-full")}>Your orders</Link>}
      <div className="flex justify-center gap-6 text-sm font-semibold">
        <Link href="/profile#orders" className="underline">All your orders</Link>
        <Link href="/" className="underline">Continue shopping</Link>
      </div>
    </div>
  );
}
