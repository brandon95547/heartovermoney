// An Art + Charity auction lot (screen design pages 5, 12, 13). Before the event it is a
// "Buy Now" page; once the live auction opens it is a "Live Auction" page. Only VIPs can buy
// or bid: art is for VIP members.
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Gallery } from "@/components/gallery";
import { LotActions } from "@/components/shop-forms";
import { PageHeader, ProgressBar, Skeleton } from "@/components/ui";
import { getUser } from "@/lib/dal";
import { dayAndTime, eventDate, money, timeLeft } from "@/lib/format";
import { getLot, getScoreboard } from "@/lib/queries";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";

export default function LotPage(props: PageProps<"/auction/[id]">) {
  return (
    <main>
      <Suspense fallback={<><PageHeader title="Auction" back="/" /><Skeleton className="m-5 h-96" /></>}>
        <Lot params={props.params} />
      </Suspense>
    </main>
  );
}

const increment = (cents: number) => (cents < 100_000 ? 2_500 : 5_000);

async function Lot({ params }: { params: PageProps<"/auction/[id]">["params"] }) {
  const { id } = await params;
  const [lot, user] = await Promise.all([getLot(id), getUser()]);
  if (!lot) notFound();
  const [event] = await db.select().from(schema.events).where(eq(schema.events.id, lot.eventId)).limit(1);
  const score = await getScoreboard(event.id, event.costCents, event.charityPercent);

  const now = new Date();
  const live = now >= lot.auctionStartsAt && now <= lot.auctionEndsAt;
  const before = now < lot.auctionStartsAt;
  const vip = !!user?.isVip;
  const current = lot.topBidCents ?? lot.startingBidCents;
  const minBid = lot.topBidCents ? lot.topBidCents + increment(lot.topBidCents) : lot.startingBidCents;
  const sold = lot.status === "sold";

  return (
    <>
      <PageHeader title={live ? "Live Auction" : "Buy Now"} back="/" />
      <div className="px-5 pt-5">
        <p className="text-xs">Public Event Contract for <span className="underline">@{lot.hostName.replace(/\s+/g, "")}</span> in <span className="underline">{lot.cityName}</span></p>
        <h2 className="mt-1 text-xl font-bold">{lot.eventTitle}</h2>
        <p className="mb-4 text-xs text-muted">{eventDate(lot.eventStartsAt)}</p>
        <ProgressBar label="Cost" percent={score.fundedPercent} />
      </div>
      <div className="mt-4"><Gallery images={lot.images} alt={lot.title} aspect="aspect-[4/3]" /></div>
      <div className="space-y-5 px-5 py-5">
        <p className="text-sm font-semibold">{lot.maker} • {lot.title}</p>
        <div className="flex justify-between gap-4">
          <div className="text-xs leading-relaxed">
            <p className="text-base font-semibold">{lot.quantityLabel}</p>
            <p>Condition: <b>New</b></p>
            <p>Retail Value: <b>{money(lot.retailValueCents)}</b></p>
            {lot.buyNowCents && <p className={live || sold ? "text-muted line-through" : ""}>Buy Now Price: <b>{money(lot.buyNowCents)}</b></p>}
          </div>
          <div className="text-right text-xs leading-relaxed">
            <p>{lot.topBidCents ? "Current Bid" : "Starting Bid"}: <span className={`text-xl font-bold ${before ? "text-mist" : ""}`}>{money(current, { cents: true })}</span></p>
            <p>
              {sold ? "Sold" : live ? "Time left" : "Auction Time"}:{" "}
              {!sold && <span className={live ? "text-alert" : "text-go"}>
                {live ? timeLeft(lot.auctionEndsAt, now) : timeLeft(lot.auctionStartsAt, now)} | {dayAndTime(live ? lot.auctionEndsAt : lot.auctionStartsAt, now)}
              </span>}
            </p>
            {lot.bidCount > 0 && <p className="text-muted">{lot.bidCount} bid{lot.bidCount === 1 ? "" : "s"}</p>}
          </div>
        </div>
        {sold ? (
          <p className="rounded-full bg-mist py-3 text-center text-sm font-semibold">Sold for {money(lot.soldCents ?? 0)}</p>
        ) : (
          <LotActions lotId={lot.id} minBidDollars={minBid / 100}
            canBuyNow={!!lot.buyNowCents && before && vip}
            canBid={live && vip}
            buyNowLabel="Buy Now" />
        )}
        {!vip && !sold && (
          <p className="text-xs text-vip">
            The auction is for VIP members. <Link href="/membership" className="font-semibold underline">Become a VIP</Link> from $25 a month.
          </p>
        )}
        <p className="text-sm leading-relaxed"><b>{lot.maker} • {lot.title}</b> {lot.description}</p>
        <p className="border-t border-line pt-4 text-xs leading-relaxed text-muted">
          Located in: {lot.cityName}, {lot.cityState}, United States. Claimed at the event.
        </p>
      </div>
    </>
  );
}
