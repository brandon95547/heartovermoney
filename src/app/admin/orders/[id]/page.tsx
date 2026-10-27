// One order: who bought what, how it's received, its certificates, and handing it over,
// shipping it or refunding it.
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { fulfillOrder, refundOrder } from "@/app/actions/admin/orders";
import { AdminForm } from "@/components/admin-form";
import { AdminTitle, Pill, Section, TextField } from "@/components/admin-ui";
import { Skeleton } from "@/components/ui";
import { requireAdmin } from "@/lib/admin";
import { isUuid } from "@/lib/admin-forms";
import { getAdminOrder } from "@/lib/admin-queries";
import { money } from "@/lib/format";

export const metadata: Metadata = { title: "Order" };

export default function AdminOrderPage(props: PageProps<"/admin/orders/[id]">) {
  return (
    <main className="p-5">
      <AdminTitle title="Order" back={{ href: "/admin/orders", label: "Orders" }} />
      <Suspense fallback={<Skeleton className="h-96" />}><Order params={props.params} /></Suspense>
    </main>
  );
}

const when = (d: Date) => d.toLocaleString("en-US", { timeZone: "America/New_York", dateStyle: "medium", timeStyle: "short" });

async function Order({ params }: { params: PageProps<"/admin/orders/[id]">["params"] }) {
  const { id } = await params;
  await requireAdmin(`/admin/orders/${id}`);
  const found = isUuid(id) ? await getAdminOrder(id) : null;
  if (!found) notFound();
  const { order: o, items, editions } = found;
  const physical = o.kind === "art" || o.kind === "lot";
  return (
    <div className="space-y-8">
      <div className="space-y-1 text-sm">
        <p className="font-mono text-xs text-muted">{o.id}</p>
        <p><b>{found.displayName}</b> (@{found.username}) · <a href={`mailto:${found.email}`} className="underline">{found.email}</a></p>
        <p className="text-muted">{when(o.createdAt)}{found.eventTitle ? ` · ${found.eventTitle}` : ""} · {o.kind === "lot" ? "auction" : o.kind}</p>
        <p>
          {o.status === "refunded" ? <Pill tone="alert">Refunded {o.refundedAt && when(o.refundedAt)}</Pill>
            : o.fulfilledAt ? <Pill tone="go">{o.fulfillment === "ship" ? "Shipped" : "Handed over"} {when(o.fulfilledAt)}</Pill>
            : <Pill tone="vip">Paid</Pill>}
        </p>
      </div>
      <ul className="divide-y divide-line rounded-md border border-line text-sm">
        {items.map((i) => (
          <li key={i.id} className="flex justify-between p-3"><span>{i.quantity > 1 ? `(${i.quantity}) ` : ""}{i.label}</span><span>{money(i.unitPriceCents * i.quantity, { cents: true })}</span></li>
        ))}
        <li className="flex justify-between p-3 font-bold"><span>Total</span><span>{money(o.totalCents, { cents: true })}</span></li>
      </ul>
      {physical && (
        <p className="text-sm">{o.fulfillment === "ship" ? <>Ship to: <b>{o.shipAddress}</b></> : "Claimed at the event."}{o.trackingNumber && <> · Tracking <b>{o.trackingNumber}</b></>}</p>
      )}
      {editions.length > 0 && (
        <Section title="Numbered pieces">
          <ul className="space-y-2 text-sm">
            {editions.map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-3">
                <Link href={`/admin/editions/${e.id}`} className="underline-offset-2 hover:underline">{e.title} · No. {e.number} of {e.size}</Link>
                {e.status !== "active" && <Pill tone="alert">{e.status}</Pill>}
              </li>
            ))}
          </ul>
        </Section>
      )}
      {o.status === "paid" && physical && !o.fulfilledAt && (
        <Section title={o.fulfillment === "ship" ? "Ship it" : "Hand it over"}>
          <AdminForm action={fulfillOrder} submit={o.fulfillment === "ship" ? "Mark shipped" : "Mark handed over"}>
            <input type="hidden" name="id" value={o.id} />
            {o.fulfillment === "ship" && <TextField label="Tracking number" name="tracking" maxLength={80} />}
          </AdminForm>
        </Section>
      )}
      {o.status === "paid" && (
        <Section title="Refund">
          <AdminForm action={refundOrder} submit={`Refund ${money(o.totalCents, { cents: true })}`} variant="danger"
            confirmText="Refund this order? It leaves the scoreboard and any numbered pieces in it are retired. This can't be undone.">
            <input type="hidden" name="id" value={o.id} />
            <TextField label="Why" name="reason" required maxLength={300} />
            <p className="text-xs text-muted">Test mode: the refund is recorded; no card is involved yet.</p>
          </AdminForm>
        </Section>
      )}
    </div>
  );
}
