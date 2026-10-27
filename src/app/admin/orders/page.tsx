// Orders, newest first, filtered by what still needs doing.
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AdminTitle, Pill } from "@/components/admin-ui";
import { Empty, Skeleton } from "@/components/ui";
import { requireAdmin } from "@/lib/admin";
import { listOrders, type OrderFilter } from "@/lib/admin-queries";
import { money } from "@/lib/format";

export const metadata: Metadata = { title: "Orders" };

const STATUSES = [["", "All"], ["open", "To hand over or ship"], ["fulfilled", "Done"], ["refunded", "Refunded"]] as const;
const KINDS = [["", "Everything"], ["art", "Art"], ["lot", "Auction"], ["food", "Food"], ["ticket", "Tickets"]] as const;

export default function AdminOrdersPage(props: PageProps<"/admin/orders">) {
  return (
    <main className="p-5">
      <AdminTitle title="Orders" />
      <Suspense fallback={<Skeleton className="h-96" />}><Orders searchParams={props.searchParams} /></Suspense>
    </main>
  );
}

async function Orders({ searchParams }: { searchParams: PageProps<"/admin/orders">["searchParams"] }) {
  await requireAdmin("/admin/orders");
  const sp = await searchParams;
  const status = STATUSES.find(([v]) => v && v === sp.status)?.[0] as OrderFilter["status"];
  const kind = KINDS.find(([v]) => v && v === sp.kind)?.[0];
  const orders = await listOrders({ status, kind: kind || undefined });
  const href = (k: string, v: string) => {
    const q = new URLSearchParams({ ...(status ? { status } : {}), ...(kind ? { kind } : {}), [k]: v });
    for (const [key, value] of [...q.entries()]) if (!value) q.delete(key);
    return `/admin/orders${q.size ? `?${q}` : ""}`;
  };
  const chip = (on: boolean) => `shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold ${on ? "border-ink bg-ink text-white" : "border-line"}`;
  return (
    <div className="space-y-5">
      <div className="-mx-5 flex gap-2 overflow-x-auto px-5 [scrollbar-width:none]">
        {STATUSES.map(([v, label]) => <Link key={v} href={href("status", v)} className={chip((status ?? "") === v)}>{label}</Link>)}
      </div>
      <div className="-mx-5 flex gap-2 overflow-x-auto px-5 [scrollbar-width:none]">
        {KINDS.map(([v, label]) => <Link key={v} href={href("kind", v)} className={chip((kind ?? "") === v)}>{label}</Link>)}
      </div>
      {orders.length ? (
        <ul className="divide-y divide-line">
          {orders.map((o) => (
            <li key={o.id}>
              <Link href={`/admin/orders/${o.id}`} className="flex items-center justify-between gap-3 py-3 text-sm">
                <span className="min-w-0">
                  <span className="block truncate font-semibold">{o.items}</span>
                  <span className="block truncate text-xs text-muted">
                    @{o.username} · {o.createdAt.toLocaleDateString("en-US", { timeZone: "America/New_York" })}{o.eventTitle ? ` · ${o.eventTitle}` : ""}
                  </span>
                </span>
                <span className="shrink-0 space-y-1 text-right">
                  <span className="block font-semibold">{money(o.totalCents)}</span>
                  {o.status === "refunded" ? <Pill tone="alert">Refunded</Pill>
                    : o.fulfilledAt ? <Pill tone="go">{o.fulfillment === "ship" ? "Shipped" : "Handed over"}</Pill>
                    : o.kind === "art" || o.kind === "lot" ? <Pill tone="vip">{o.fulfillment === "ship" ? "To ship" : "At the event"}</Pill>
                    : <Pill>{o.kind}</Pill>}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : <Empty>No orders match.</Empty>}
    </div>
  );
}
