// Event overview (screen design page 10; development overview page 4), and the Posts
// section's homepage for the current event (the client, October 2026). Down the left, the
// posts: photos attached to the event, each opening full screen on the photo wall (page 9),
// with + on top for a signed-in guest to post one. Beside them, the event contract's progress,
// its story, terms and documents, the way in to register, and the city's collection. Swipe right
// to left for the details.
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ChevronRight, FileText, Plus } from "lucide-react";
import { ArtImage } from "@/components/art-image";
import { AutoRefresh, SwipeTo } from "@/components/event-client";
import { SiteMenu, SiteMenuFallback } from "@/components/site-menu";
import { PageHeader, ProgressBar, Skeleton, buttonClass } from "@/components/ui";
import { CARD_DESIGNS } from "@/lib/cards";
import { getUser } from "@/lib/dal";
import { getEvent, getNextEvent, getRegistration, getScoreboard, listPhotos } from "@/lib/queries";
import { EventHeading } from "./event-heading";

export default function EventOverviewPage(props: PageProps<"/events/[slug]">) {
  return (
    <main>
      <PageHeader title="Overview" left={<Suspense fallback={<SiteMenuFallback />}><SiteMenu /></Suspense>} />
      <Suspense fallback={<Skeleton className="m-5 h-96" />}><Overview params={props.params} /></Suspense>
    </main>
  );
}

async function Overview({ params }: { params: PageProps<"/events/[slug]">["params"] }) {
  const { slug } = await params;
  const found = await getEvent(slug);
  if (!found) notFound();
  const { event, cityName, citySlug } = found;
  const user = await getUser();
  const [score, photos, registration, next] = await Promise.all([
    getScoreboard(event.id, event.costCents, event.charityPercent),
    listPhotos(event.id),
    user ? getRegistration(event.id, user.id) : null,
    getNextEvent(),
  ]);
  // Registration (the card process at /events) is open for the next event only.
  const canRegister = !registration && next?.id === event.id;
  const days = Math.max(0, Math.ceil((event.startsAt.getTime() - new Date().getTime()) / 86_400_000));

  return (
    <SwipeTo href={`/events/${slug}/details`}>
      <AutoRefresh seconds={15} />
      <div className="grid grid-cols-[6.5rem_1fr] gap-4 p-4">
        <ul className="space-y-2" aria-label="Posts">
          {user && (
            <li>
              <Link href={`/events/${slug}/photos/new`} aria-label="Post a photo to this event" title="Post a photo"
                className="flex aspect-square items-center justify-center rounded-sm border-2 border-dashed border-ink/40 text-ink hover:border-ink hover:bg-fog">
                <Plus className="size-8" strokeWidth={1.5} />
              </Link>
            </li>
          )}
          {photos.slice(0, 6).map((p) => (
            <li key={p.id}>
              <Link href={`/events/${slug}/photos#${p.id}`} className="relative block aspect-square overflow-hidden rounded-sm bg-mist">
                <ArtImage src={p.image} alt={p.caption || `Photo by @${p.username}`} sizes="104px" />
              </Link>
            </li>
          ))}
          <li>
            <Link href={`/events/${slug}/photos`} className="flex aspect-square items-center justify-center rounded-sm bg-fog text-center text-[11px] font-semibold">All photos</Link>
          </li>
        </ul>
        <div className="min-w-0 space-y-4">
          <EventHeading host={event.hostName} city={cityName} title={event.title} startsAt={event.startsAt} />
          {registration && (
            <p className="rounded-md bg-ink px-3 py-2 text-xs text-white">
              You&apos;re registered. Your {CARD_DESIGNS[registration.design].name} card is {registration.fulfillment === "ship" ? "on its way by mail" : "waiting at the door"}.
              {registration.jokerChoice === "kept" && " You have VIP access."}
              {registration.jokerChoice === "gift_card" && " Your $20 gift card is ready."}
            </p>
          )}
          {canRegister && (
            <Link href="/events" className={buttonClass("black", "h-10 w-full text-xs")}>Register and get your card</Link>
          )}
          <ProgressBar label="Cost" percent={score.fundedPercent} />
          <dl className="grid grid-cols-3 gap-2 text-sm">
            <div><dt className="sr-only">Funded</dt><dd className="font-bold">{score.fundedPercent}%</dd><dd className="text-xs">funded</dd></div>
            <div><dt className="sr-only">Committed</dt><dd className="font-bold">{score.committed}</dd><dd className="text-xs">committed</dd></div>
            <div><dt className="sr-only">Days to go</dt><dd className="font-bold">{days}</dd><dd className="text-xs">{days === 1 ? "day" : "days"} to go</dd></div>
          </dl>
          <p className="text-xs leading-relaxed">{event.description}</p>
          {event.terms && (
            <details id="terms" className="rounded-md border border-line p-3 text-xs">
              <summary className="cursor-pointer font-semibold">Terms of the contract</summary>
              <div className="mt-2 space-y-2 leading-relaxed">{event.terms.split("\n").map((line) => <p key={line}>{line}</p>)}</div>
            </details>
          )}
          {event.documents.length > 0 && (
            <ul className="divide-y divide-paper overflow-hidden rounded-md bg-fog">
              {event.documents.map((d) => (
                <li key={d.name}>
                  {d.url && d.url !== "#" ? (
                    <a href={d.url} target="_blank" rel="noopener" className="flex items-center gap-3 px-3 py-3 text-xs"><FileText className="size-4 shrink-0" strokeWidth={1.5} />{d.name}</a>
                  ) : (
                    <span className="flex items-center gap-3 px-3 py-3 text-xs text-muted"><FileText className="size-4 shrink-0" strokeWidth={1.5} />{d.name} · shared soon</span>
                  )}
                </li>
              ))}
            </ul>
          )}
          <Link href={`/events/${slug}/details`} className={buttonClass("outline", "h-10 w-full text-xs")}>
            Details and scoreboard <ChevronRight className="size-4" />
          </Link>
          <Link href={`/events/${slug}/menu`} className={buttonClass("quiet", "h-10 w-full text-xs")}>Order food + drink</Link>
          <Link href={`/cities/${citySlug}`} className="block text-center text-xs font-semibold underline">See the {cityName} collection</Link>
        </div>
      </div>
    </SwipeTo>
  );
}
