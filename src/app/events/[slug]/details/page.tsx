// Event details (screen design page 11): sponsors and Tonight's Scoreboard: what was given,
// what it cost, what came in, and every limited-edition sale. VIPs' names are shown only to
// other VIPs; everyone else sees them masked.
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { DollarSign, Heart } from "lucide-react";
import { AutoRefresh } from "@/components/event-client";
import { PageHeader, ProgressBar, SectionLabel, Skeleton } from "@/components/ui";
import { getUser } from "@/lib/dal";
import { money } from "@/lib/format";
import { isVipMember } from "@/lib/membership";
import { getEvent, getScoreboard, listEventSales } from "@/lib/queries";
import { EventHeading } from "../event-heading";

export default function EventDetailsPage(props: PageProps<"/events/[slug]/details">) {
  return (
    <main>
      <Suspense fallback={<><PageHeader title="Details" /><Skeleton className="m-5 h-96" /></>}>
        <Details params={props.params} />
      </Suspense>
    </main>
  );
}

// The same width for every name, so the mask gives nothing away.
const mask = () => "@########";

async function Details({ params }: { params: PageProps<"/events/[slug]/details">["params"] }) {
  const { slug } = await params;
  const found = await getEvent(slug);
  if (!found) notFound();
  const { event, cityName } = found;
  const [score, sales, viewer] = await Promise.all([
    getScoreboard(event.id, event.costCents, event.charityPercent),
    listEventSales(event.id),
    getUser(),
  ]);
  const costShare = score.net > 0 ? (event.costCents / score.revenue) * 100 : 100;
  // Hidden from everyone if the buyer chose so in Settings; a VIP's name only to other VIPs.
  const showName = (username: string, role: string, tier: string | null, shown: boolean) =>
    shown && (!isVipMember(role, tier) || viewer?.isVip) ? `@${username}` : mask();

  return (
    <>
      <PageHeader title="Details" back={`/events/${slug}`} />
      <AutoRefresh seconds={15} />
      <div className="space-y-6 py-5">
        <div className="space-y-4 px-5">
          <EventHeading host={event.hostName} city={cityName} title={event.title} startsAt={event.startsAt} />
          {/* Until revenue covers the cost, how far along it is; after that, how revenue splits
              between the cost and the profit. */}
          {score.net > 0 ? (
            <div className="relative flex h-8 overflow-hidden rounded-md bg-mist text-[11px] font-semibold uppercase text-white" aria-label={`Cost ${Math.round(costShare)}% of revenue`}>
              <span className="flex items-center bg-charcoal px-3" style={{ width: `${costShare}%` }}>Cost</span>
              <span className="flex flex-1 items-center gap-2 bg-ink px-3">Profit <Heart className="size-4 fill-white" /></span>
            </div>
          ) : <ProgressBar label="Cost" percent={score.fundedPercent} />}
        </div>

        {event.sponsors.length > 0 && (
          <section className="bg-fog px-5 py-4">
            <SectionLabel className="mb-3">Sponsors</SectionLabel>
            <ul className="flex gap-3 overflow-x-auto [scrollbar-width:none]">
              {event.sponsors.map((sp) => (
                <li key={sp.name} className="flex h-20 w-28 shrink-0 items-center justify-center rounded-md bg-paper p-2 text-center text-xs font-bold">{sp.name}</li>
              ))}
            </ul>
          </section>
        )}

        <section className="space-y-2 px-5">
          <SectionLabel className="mb-3">Tonight&apos;s Scoreboard</SectionLabel>
          <Row className="bg-vip text-white" icon={<Heart className="size-4 fill-white" />} label={`Donated to @${event.charityName.replace(/\s+/g, "")}`} value={money(score.charity)} />
          <Row className="bg-ink text-white" icon={<DollarSign className="size-4" />} label="Profit for the group" value={money(score.groupProfit)} />
          <Row className="bg-[#fdecea]" label="Total event cost" value={`-${money(score.costCents)}`} />
          <Row className="bg-[#e8f5e9]" label="Total event revenue" value={money(score.revenue)} />
        </section>

        <section className="px-5">
          <SectionLabel className="mb-2">Total revenue</SectionLabel>
          <dl className="space-y-1 text-sm">
            {[["VIP tickets", score.tickets], ["Food + bev", score.food], ["Product sells", score.products], ["Art sells", score.art]].map(([l, v]) => (
              <div key={l as string} className="flex justify-between"><dt className="uppercase tracking-wide">{l}</dt><dd className="font-bold">{money(v as number)}</dd></div>
            ))}
          </dl>
        </section>

        <section className="bg-fog px-5 py-4">
          <table className="w-full text-xs">
            <thead><tr className="text-left text-[10px] uppercase text-muted"><th className="pb-2 font-medium">Sold by</th><th className="pb-2 font-medium">Sold to</th><th className="pb-2 text-right font-medium">Price</th></tr></thead>
            <tbody>
              {sales.map((sale) => (
                <tr key={sale.id} className="border-t border-line/60">
                  <td className="py-1.5">
                    {sale.soldBy}
                    {(sale.artSlug || sale.lotId) && (
                      <Link href={sale.artSlug ? `/art/${sale.artSlug}` : `/auctions/${sale.lotId}`} className="block text-[10px] text-muted underline-offset-2 hover:underline">{sale.label}</Link>
                    )}
                  </td>
                  <td className="py-1.5">{showName(sale.buyer, sale.buyerRole, sale.buyerTier, sale.buyerShown)}</td>
                  <td className="py-1.5 text-right">{money(sale.unitPriceCents * sale.quantity)}</td>
                </tr>
              ))}
              {!sales.length && <tr><td colSpan={3} className="py-4 text-center text-muted">No art sold yet tonight.</td></tr>}
            </tbody>
          </table>
          {!viewer?.isVip && sales.length > 0 && (
            <p className="mt-3 text-[11px] text-muted">
              VIP members&apos; names are shown only to other VIPs. <Link href={`/membership?next=${encodeURIComponent(`/events/${event.slug}/details`)}`} className="font-semibold text-vip underline">Become a VIP</Link>
            </p>
          )}
        </section>
      </div>
    </>
  );
}

function Row({ className, icon, label, value }: { className: string; icon?: React.ReactNode; label: string; value: string }) {
  return (
    <div className={`flex items-center justify-between rounded-sm px-4 py-2.5 text-xs font-semibold uppercase tracking-wide ${className}`}>
      <span className="flex items-center gap-3">{icon}{label}</span><span>{value}</span>
    </div>
  );
}
