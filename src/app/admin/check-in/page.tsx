// The door: staff scan a guest's QR (or type the card's code) to hand over their collector
// card. Admins only.
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { checkInCard } from "@/app/actions/events";
import { Empty, PageHeader, Skeleton, buttonClass } from "@/components/ui";
import { CARD_DESIGNS } from "@/lib/cards";
import { requireUser } from "@/lib/dal";
import { eventDate } from "@/lib/format";
import { getCheckIn } from "@/lib/queries";

export const metadata: Metadata = { title: "Check-in" };

export default function CheckInPage(props: PageProps<"/admin/check-in">) {
  return (
    <main>
      <PageHeader title="Check-in" back="/profile" />
      <Suspense fallback={<Skeleton className="m-5 h-64" />}><CheckIn searchParams={props.searchParams} /></Suspense>
    </main>
  );
}

async function CheckIn({ searchParams }: { searchParams: PageProps<"/admin/check-in">["searchParams"] }) {
  const sp = await searchParams;
  const code = typeof sp.code === "string" ? sp.code.slice(0, 40) : "";
  const user = await requireUser(`/admin/check-in${code ? `?code=${encodeURIComponent(code)}` : ""}`);
  if (user.role !== "admin") notFound();
  const found = code ? await getCheckIn(code) : null;
  return (
    <div className="space-y-6 p-5">
      <form action="/admin/check-in" className="flex gap-3">
        <input name="code" defaultValue={code} placeholder="Card code, e.g. HOM-0001" aria-label="Card code" autoCapitalize="characters"
          className="h-12 min-w-0 flex-1 rounded-md bg-fog px-4 font-mono text-sm uppercase outline-none focus:ring-2 focus:ring-ink/20" />
        <button className={buttonClass("black")}>Find</button>
      </form>
      {code && !found && <Empty>No registered card has the code {code.toUpperCase()}.</Empty>}
      {found && (
        <div className="space-y-4 rounded-md border border-line p-5">
          <div className="flex items-center gap-4">
            <span className="flex aspect-[5/7] w-14 items-center justify-center rounded-md bg-ink text-2xl text-white" aria-hidden>{CARD_DESIGNS[found.design].face}</span>
            <div className="text-sm">
              <p className="text-lg font-bold">{found.displayName}</p>
              <p className="text-muted">@{found.username}</p>
              <p className="font-mono text-xs">{found.code} · {CARD_DESIGNS[found.design].name}</p>
            </div>
          </div>
          <p className="text-sm">{found.eventTitle} · {found.cityName} · {eventDate(found.eventStartsAt)}</p>
          {found.jokerChoice === "kept" && <p className="rounded bg-vip/10 px-3 py-2 text-sm font-semibold text-vip">Kept the Joker: VIP access tonight</p>}
          {found.jokerChoice === "gift_card" && <p className="rounded bg-fog px-3 py-2 text-sm font-semibold">Give a $20 gift card</p>}
          {found.fulfillment === "ship" ? (
            <p className="rounded bg-fog px-3 py-2 text-sm">This card is being mailed, not collected at the door.</p>
          ) : found.checkedInAt ? (
            <p className="rounded bg-go/10 px-3 py-2 text-sm font-semibold text-go">Handed over at {found.checkedInAt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/New_York" })}</p>
          ) : (
            <form action={checkInCard}>
              <input type="hidden" name="code" value={found.code} />
              <button className={buttonClass("black", "w-full")}>Hand over the card</button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
