// Auction lots, soonest to close first, with where each stands and its bids.
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AdminTitle, Pill, adminLink } from "@/components/admin-ui";
import { ArtImage } from "@/components/art-image";
import { Empty, Skeleton } from "@/components/ui";
import { requireAdmin } from "@/lib/admin";
import { isUuid } from "@/lib/admin-forms";
import { listAdminLots } from "@/lib/admin-queries";
import { PHASE_LABEL, lotPhase } from "@/lib/auctions";
import { money } from "@/lib/format";

export const metadata: Metadata = { title: "Auctions" };

export default function AdminAuctionsPage(props: PageProps<"/admin/auctions">) {
  return (
    <main className="p-5">
      <AdminTitle title="Auction lots" action={<Link href="/admin/auctions/new" className={adminLink}>+ New lot</Link>} />
      <Suspense fallback={<Skeleton className="h-96" />}><Lots searchParams={props.searchParams} /></Suspense>
    </main>
  );
}

async function Lots({ searchParams }: { searchParams: PageProps<"/admin/auctions">["searchParams"] }) {
  await requireAdmin("/admin/auctions");
  const sp = await searchParams;
  const lots = await listAdminLots(isUuid(sp.event) ? sp.event : undefined);
  const now = new Date();
  if (!lots.length) return <Empty>No lots yet.</Empty>;
  return (
    <ul className="divide-y divide-line">
      {lots.map((l) => {
        const phase = lotPhase(l, now);
        const ended = l.status === "open" && now > l.auctionEndsAt;
        return (
          <li key={l.id}>
            <Link href={`/admin/auctions/${l.id}`} className="flex gap-3 py-3 text-sm">
              <span className="relative size-14 shrink-0 overflow-hidden rounded-sm bg-mist"><ArtImage src={l.images[0]} alt="" sizes="56px" /></span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{l.title}</span>
                <span className="block truncate text-xs text-muted">{l.maker} · {l.eventTitle}</span>
                <span className="mt-1 flex flex-wrap gap-2 text-xs">
                  {l.status === "sold" ? <Pill tone="go">Sold {money(l.soldCents ?? 0)}</Pill> : ended ? <Pill tone="alert">Ended: close it</Pill> : <Pill tone={phase === "live" ? "alert" : "neutral"}>{PHASE_LABEL[phase]}</Pill>}
                  <span>{l.bidCount} bid{l.bidCount === 1 ? "" : "s"}{l.topBidCents ? ` · top ${money(l.topBidCents)}` : ""}</span>
                  <Pill>{l.isArt ? "Art · VIP" : "Open to all"}</Pill>
                </span>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
