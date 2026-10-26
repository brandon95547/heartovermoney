// Event overview (screen design page 10): photos posted live down the left, the event
// contract's progress, its story and documents. Swipe right to left for the details.
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ChevronRight, FileText } from "lucide-react";
import { ArtImage } from "@/components/art-image";
import { AutoRefresh, SwipeTo } from "@/components/event-client";
import { PageHeader, ProgressBar, Skeleton, buttonClass } from "@/components/ui";
import { getEvent, getScoreboard, listPhotos } from "@/lib/queries";
import { EventHeading } from "./event-heading";

export default function EventOverviewPage(props: PageProps<"/events/[slug]">) {
  return (
    <main>
      <PageHeader title="Overview" back="/events" />
      <Suspense fallback={<Skeleton className="m-5 h-96" />}><Overview params={props.params} /></Suspense>
    </main>
  );
}

async function Overview({ params }: { params: PageProps<"/events/[slug]">["params"] }) {
  const { slug } = await params;
  const found = await getEvent(slug);
  if (!found) notFound();
  const { event, cityName } = found;
  const [score, photos] = await Promise.all([
    getScoreboard(event.id, event.costCents, event.charityPercent),
    listPhotos(event.id),
  ]);
  const days = Math.max(0, Math.ceil((event.startsAt.getTime() - new Date().getTime()) / 86_400_000));

  return (
    <SwipeTo href={`/events/${slug}/details`}>
      <AutoRefresh seconds={15} />
      <div className="grid grid-cols-[6.5rem_1fr] gap-4 p-4">
        <ul className="space-y-2" aria-label="Latest photos">
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
          <ProgressBar label="Cost" percent={score.fundedPercent} />
          <dl className="grid grid-cols-3 gap-2 text-sm">
            <div><dt className="sr-only">Funded</dt><dd className="font-bold">{score.fundedPercent}%</dd><dd className="text-xs">funded</dd></div>
            <div><dt className="sr-only">Committed</dt><dd className="font-bold">{score.committed}</dd><dd className="text-xs">committed</dd></div>
            <div><dt className="sr-only">Days to go</dt><dd className="font-bold">{days}</dd><dd className="text-xs">{days === 1 ? "day" : "days"} to go</dd></div>
          </dl>
          <p className="text-xs leading-relaxed">{event.description}</p>
          <ul className="divide-y divide-paper overflow-hidden rounded-md bg-fog">
            {event.documents.map((d) => (
              <li key={d.name}>
                <a href={d.url} className="flex items-center gap-3 px-3 py-3 text-xs"><FileText className="size-4 shrink-0" strokeWidth={1.5} />{d.name}</a>
              </li>
            ))}
          </ul>
          <Link href={`/events/${slug}/details`} className={buttonClass("outline", "h-10 w-full text-xs")}>
            Details and scoreboard <ChevronRight className="size-4" />
          </Link>
          <Link href={`/events/${slug}/menu`} className={buttonClass("quiet", "h-10 w-full text-xs")}>Order food + drink</Link>
        </div>
      </div>
    </SwipeTo>
  );
}
