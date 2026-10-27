// One lot: its details, its bids (highest first), and closing it.
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { closeLot, deleteLot, removeBid } from "@/app/actions/admin/auctions";
import { AdminForm } from "@/components/admin-form";
import { AdminTitle, Pill, Section, adminLink } from "@/components/admin-ui";
import { Skeleton } from "@/components/ui";
import { requireAdmin } from "@/lib/admin";
import { isUuid } from "@/lib/admin-forms";
import { getAdminLot, listEventsBrief } from "@/lib/admin-queries";
import { PHASE_LABEL, lotPhase } from "@/lib/auctions";
import { money } from "@/lib/format";
import { LotForm } from "../lot-form";

export const metadata: Metadata = { title: "Lot" };

export default function AdminLotPage(props: PageProps<"/admin/auctions/[id]">) {
  return (
    <main className="p-5">
      <AdminTitle title="Lot" back={{ href: "/admin/auctions", label: "Auction lots" }} />
      <Suspense fallback={<Skeleton className="h-96" />}><Lot params={props.params} /></Suspense>
    </main>
  );
}

async function Lot({ params }: { params: PageProps<"/admin/auctions/[id]">["params"] }) {
  const { id } = await params;
  await requireAdmin(`/admin/auctions/${id}`);
  const found = isUuid(id) ? await getAdminLot(id) : null;
  if (!found) notFound();
  const { lot, bids, buyer } = found;
  const phase = lotPhase(lot);
  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-center gap-4 text-sm">
        {lot.status === "sold" ? <Pill tone="go">Sold to @{buyer} for {money(lot.soldCents ?? 0)}</Pill> : <Pill>{PHASE_LABEL[phase]}</Pill>}
        <Link href={`/auctions/${lot.id}`} className={adminLink}>View on the site</Link>
      </div>
      <Section title={`Bids (${bids.length})`}>
        {bids.length ? (
          <ul className="divide-y divide-line">
            {bids.map((b, i) => (
              <li key={b.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span><b>{money(b.amountCents)}</b> · @{b.username}{i === 0 && <> · <Pill tone="vip">Highest</Pill></>}
                  <span className="block text-xs text-muted">{b.createdAt.toLocaleString("en-US", { timeZone: "America/New_York", dateStyle: "medium", timeStyle: "short" })}</span>
                </span>
                {lot.status === "open" && (
                  <AdminForm action={removeBid} submit="Remove" variant="danger" className="flex items-end gap-2 [&_button]:h-8 [&_button]:px-3 [&_button]:text-xs"
                    confirmText={`Remove @${b.username}'s ${money(b.amountCents)} bid?`}>
                    <input type="hidden" name="bidId" value={b.id} />
                    <input name="reason" required maxLength={300} placeholder="Why" aria-label="Why"
                      className="h-8 w-28 rounded-md bg-fog px-2 text-xs outline-none" />
                  </AdminForm>
                )}
              </li>
            ))}
          </ul>
        ) : <p className="text-sm text-muted">No bids yet.</p>}
      </Section>
      {lot.status === "open" && (
        <Section title="Close the auction">
          <AdminForm action={closeLot} submit={bids.length ? `Sell to @${bids[0].username} for ${money(bids[0].amountCents)}` : "Close with no sale"}
            confirmText={bids.length ? `Sell “${lot.title}” to @${bids[0].username} for ${money(bids[0].amountCents)}?` : `Close “${lot.title}” unsold?`}>
            <input type="hidden" name="id" value={lot.id} />
            <p className="text-xs text-muted">The winner gets an order (test mode: recorded as paid), counted on the event&apos;s scoreboard, and collects the lot at the event.</p>
          </AdminForm>
        </Section>
      )}
      {lot.status !== "sold" && <LotForm lot={lot} events={await listEventsBrief()} />}
      {lot.status !== "sold" && bids.length === 0 && (
        <Section title="Delete">
          <AdminForm action={deleteLot} submit="Delete this lot" variant="danger" confirmText={`Delete “${lot.title}”?`}>
            <input type="hidden" name="id" value={lot.id} />
          </AdminForm>
        </Section>
      )}
    </div>
  );
}
