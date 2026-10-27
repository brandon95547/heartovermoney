// My Cards: every collector card claimed through the card process, its event, and where it
// stands: waiting at the door (with the code to show there), in the mail, or handed over.
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Empty, PageHeader, Skeleton, buttonClass } from "@/components/ui";
import { CARD_DESIGNS } from "@/lib/cards";
import { checkInQr } from "@/lib/check-in";
import { requireUser } from "@/lib/dal";
import { eventDate } from "@/lib/format";
import { listMyCards } from "@/lib/queries";

export const metadata: Metadata = { title: "My cards" };

export default function MyCardsPage() {
  return (
    <main>
      <PageHeader title="My cards" back="/profile" />
      <Suspense fallback={<Skeleton className="m-5 h-80" />}><Cards /></Suspense>
    </main>
  );
}

async function Cards() {
  const user = await requireUser("/profile/cards");
  const cards = await listMyCards(user.id);
  if (!cards.length) {
    return (
      <div className="space-y-4 p-5">
        <Empty>Collector cards you claim for an event appear here, with the code to show at the door.</Empty>
        <Link href="/events" className={buttonClass("black", "w-full")}>Get your card for the next event</Link>
      </div>
    );
  }
  const qrs = await Promise.all(cards.map((c) => (c.fulfillment === "pickup" && !c.checkedInAt ? checkInQr(c.code, 132) : null)));
  return (
    <ul className="space-y-4 p-5">
      {cards.map((c, i) => {
        const design = CARD_DESIGNS[c.design];
        const status = c.checkedInAt
          ? `Handed over ${c.checkedInAt.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "America/New_York" })}`
          : c.fulfillment === "ship" ? "Shipping by mail" : "Waiting at the door";
        return (
          <li key={c.code} className="rounded-md border border-line p-4">
            <div className="flex gap-4">
              <span className="flex aspect-[5/7] w-16 shrink-0 items-center justify-center rounded-md bg-ink text-3xl text-white" aria-hidden>{design.face}</span>
              <div className="min-w-0 flex-1 text-sm">
                <p className="font-bold">{design.name}</p>
                <p className="font-mono text-xs">{c.code}</p>
                <Link href={`/events/${c.eventSlug}`} className="mt-1 block font-semibold underline-offset-2 hover:underline">{c.eventTitle} · {c.cityName}</Link>
                <p className="text-xs text-muted">{eventDate(c.eventStartsAt)} · {c.venue}</p>
                <p className="mt-1 inline-block rounded bg-fog px-2 py-0.5 text-xs font-semibold">{status}</p>
                {c.jokerChoice === "kept" && <p className="mt-1 text-xs font-semibold text-vip">Joker kept: VIP access at the event</p>}
                {c.jokerChoice === "gift_card" && <p className="mt-1 text-xs font-semibold">$20 gift card to spend at the event</p>}
                {c.fulfillment === "ship" && c.shipAddress && <p className="mt-1 text-xs text-muted">To: {c.shipAddress}</p>}
              </div>
            </div>
            {qrs[i] && (
              <div className="mt-4 flex items-center gap-4 border-t border-line pt-4">
                <span className="shrink-0" dangerouslySetInnerHTML={{ __html: qrs[i]! }} role="img" aria-label={`Check-in code ${c.code}`} />
                <p className="text-xs leading-relaxed text-muted">Show this at the door to collect your card. Staff scan it, or read them the code.</p>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
