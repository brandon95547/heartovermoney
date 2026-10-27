// Every auction lot, grouped by where it stands: live bidding, VIP early Buy Now, preview and
// closed. Art lots are marked, since only VIPs can buy or bid on them.
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ArtImage } from "@/components/art-image";
import { Empty, PageHeader, SectionLabel, Skeleton } from "@/components/ui";
import { lotPhase, PHASE_LABEL, type LotPhase } from "@/lib/auctions";
import { getUser } from "@/lib/dal";
import { dayAndTime, money, timeLeft } from "@/lib/format";
import { listLots } from "@/lib/queries";

export const metadata: Metadata = { title: "Auctions" };

export default function AuctionsPage() {
  return (
    <main>
      <PageHeader title="Auctions" back="/" />
      <Suspense fallback={<Skeleton className="m-5 h-96" />}><Lots /></Suspense>
    </main>
  );
}

const ORDER: LotPhase[] = ["live", "early", "preview", "closed"];

async function Lots() {
  const [lots, user] = await Promise.all([listLots(), getUser()]);
  const now = new Date();
  if (!lots.length) return <div className="p-5"><Empty>No auction lots yet. They are announced before each event.</Empty></div>;
  const groups = ORDER.map((phase) => ({ phase, lots: lots.filter((l) => lotPhase(l, now) === phase) })).filter((g) => g.lots.length);
  return (
    <div className="space-y-8 p-5">
      <p className="text-sm text-muted">
        VIP members can take a lot early with Buy Now before the event. At the live auction anyone signed in can bid, except on art, which is for VIP members.
        {!user?.isVip && <> <Link href="/membership?next=/auctions" className="font-semibold text-vip underline">Become a VIP</Link></>}
      </p>
      {groups.map(({ phase, lots }) => (
        <section key={phase}>
          <SectionLabel className="mb-3">{PHASE_LABEL[phase]}</SectionLabel>
          <ul className="divide-y divide-line">
            {lots.map((l) => {
              const sold = l.status === "sold";
              const price = phase === "early" && l.buyNowCents ? `Buy Now ${money(l.buyNowCents)}`
                : `${l.topBidCents ? "Current bid" : "Starting bid"} ${money(l.topBidCents ?? l.startingBidCents)}`;
              const when = phase === "live" ? `${timeLeft(l.auctionEndsAt, now)} left`
                : phase === "closed" ? (sold ? "Sold" : "Closed")
                : `Bidding opens ${dayAndTime(l.auctionStartsAt, now)}`;
              return (
                <li key={l.id}>
                  <Link href={`/auctions/${l.id}`} className="flex gap-4 py-4">
                    <span className="relative size-20 shrink-0 overflow-hidden rounded-sm bg-mist">
                      <ArtImage src={l.images[0]} alt={l.title} sizes="80px" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{l.title}</span>
                      <span className="block truncate text-xs text-muted">{l.maker} · {l.eventTitle}, {l.cityName}</span>
                      <span className="mt-1 block text-sm">{price}</span>
                      <span className="mt-1 flex flex-wrap gap-2 text-[11px]">
                        <span className={phase === "live" ? "font-semibold text-alert" : "text-muted"}>{when}</span>
                        <span className="rounded bg-fog px-1.5 font-semibold">{l.isArt ? "Art · VIP" : "Open to all"}</span>
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
