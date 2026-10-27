// An Art + Charity auction lot (screen design pages 5, 12, 13). Before the event it is a
// "Buy Now" page, where VIPs can take the early deal; once the live auction opens it is a "Live
// Auction" page, where anyone signed in can bid, except on art, which stays VIP-only.
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Gallery } from "@/components/gallery";
import { LotActions } from "@/components/shop-forms";
import { PageHeader, ProgressBar, Skeleton } from "@/components/ui";
import { canBidOn, lotPhase } from "@/lib/auctions";
import { getUser } from "@/lib/dal";
import { dayAndTime, eventDate, money, timeLeft } from "@/lib/format";
import { withNext } from "@/lib/next-path";
import { getLot, getScoreboard } from "@/lib/queries";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";

export default function LotPage(props: PageProps<"/auctions/[id]">) {
  return (
    <main>
      <Suspense fallback={<><PageHeader title="Auction" back="/auctions" /><Skeleton className="m-5 h-96" /></>}>
        <Lot params={props.params} />
      </Suspense>
    </main>
  );
}

const increment = (cents: number) => (cents < 100_000 ? 2_500 : 5_000);

async function Lot({ params }: { params: PageProps<"/auctions/[id]">["params"] }) {
  const { id } = await params;
  const [lot, user] = await Promise.all([getLot(id), getUser()]);
  if (!lot) notFound();
  const [event] = await db.select().from(schema.events).where(eq(schema.events.id, lot.eventId)).limit(1);
  const score = await getScoreboard(event.id, event.costCents, event.charityPercent);

  const now = new Date();
  const phase = lotPhase(lot, now);
  const live = phase === "live";
  const before = phase === "early" || phase === "preview";
  const vip = !!user?.isVip;
  const current = lot.topBidCents ?? lot.startingBidCents;
  const minBid = lot.topBidCents ? lot.topBidCents + increment(lot.topBidCents) : lot.startingBidCents;
  const sold = lot.status === "sold";
  const here = `/auctions/${lot.id}`;
  // What a visitor who can't act yet needs to do, and where that link goes.
  const note = sold || phase === "closed" ? null
    : !user ? { text: before ? "Buy Now is an early deal for VIP members." : "Sign in to bid.", link: withNext("/signin", here), label: "Sign in" }
    : phase === "early" && !vip ? { text: "Buy Now before the event is an early deal for VIP members.", link: withNext("/membership", here), label: "Become a VIP" }
    : live && !canBidOn(lot, vip) ? { text: "Bidding on art is for VIP members.", link: withNext("/membership", here), label: "Become a VIP" }
    : before && !lot.isArt ? { text: "Everyone signed in can bid when the live auction opens.", link: null, label: "" }
    : null;

  return (
    <>
      <PageHeader title={live ? "Live Auction" : "Buy Now"} back="/auctions" />
      <div className="px-5 pt-5">
        <p className="text-xs">Public Event Contract for <span className="underline">@{lot.hostName.replace(/\s+/g, "")}</span> in <span className="underline">{lot.cityName}</span></p>
        <Link href={`/events/${lot.eventSlug}`} className="mt-1 block text-xl font-bold">{lot.eventTitle}</Link>
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
            <p className="mt-1 inline-block rounded bg-fog px-2 py-0.5 font-semibold">{lot.isArt ? "Art · VIP members" : "Open to all bidders"}</p>
          </div>
          <div className="text-right text-xs leading-relaxed">
            <p>{lot.topBidCents ? "Current Bid" : "Starting Bid"}: <span className={`text-xl font-bold ${before ? "text-mist" : ""}`}>{money(current, { cents: true })}</span></p>
            <p>
              {sold ? "Sold" : phase === "closed" ? "Closed" : live ? "Time left" : "Auction Time"}:{" "}
              {!sold && phase !== "closed" && <span className={live ? "text-alert" : "text-go"}>
                {live ? timeLeft(lot.auctionEndsAt, now) : timeLeft(lot.auctionStartsAt, now)} | {dayAndTime(live ? lot.auctionEndsAt : lot.auctionStartsAt, now)}
              </span>}
            </p>
            {lot.bidCount > 0 && <p className="text-muted">{lot.bidCount} bid{lot.bidCount === 1 ? "" : "s"}</p>}
          </div>
        </div>
        {sold ? (
          <p className="rounded-full bg-mist py-3 text-center text-sm font-semibold">Sold for {money(lot.soldCents ?? 0)}</p>
        ) : phase === "closed" ? (
          <p className="rounded-full bg-mist py-3 text-center text-sm font-semibold">Bidding has closed</p>
        ) : (
          <LotActions lotId={lot.id} minBidDollars={minBid / 100}
            canBuyNow={phase === "early" && vip}
            canBid={live && !!user && canBidOn(lot, vip)}
            buyNowLabel="Buy Now" />
        )}
        {note && (
          <p className="text-xs text-vip">
            {note.text}{note.link && <> <Link href={note.link} className="font-semibold underline">{note.label}</Link>{note.label === "Become a VIP" ? " from $25 a month." : "."}</>}
          </p>
        )}
        <p className="text-sm leading-relaxed"><b>{lot.maker} • {lot.title}</b> {lot.description}</p>
        <div className="space-y-1 border-t border-line pt-4 text-xs leading-relaxed text-muted">
          <p>Located in: {lot.cityName}, {lot.cityState}, United States</p>
          <p>Pickup: the winner claims the lot at the event.</p>
        </div>
      </div>
    </>
  );
}
