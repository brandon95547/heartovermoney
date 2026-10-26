// Posts home: the events, each with its overview, photo wall and menu.
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ArtImage } from "@/components/art-image";
import { Logo } from "@/components/logo";
import { Skeleton } from "@/components/ui";
import { eventDate } from "@/lib/format";
import { listEvents } from "@/lib/queries";

export const metadata: Metadata = { title: "Events" };

export default function EventsPage() {
  return (
    <main className="px-5 pb-8">
      <div className="flex justify-center py-6"><Logo size={56} /></div>
      <h1 className="mb-4 text-lg">Events</h1>
      <Suspense fallback={<Skeleton className="h-56" />}><Events /></Suspense>
    </main>
  );
}

async function Events() {
  const events = await listEvents();
  return (
    <ul className="space-y-4">
      {events.map((e) => (
        <li key={e.id}>
          <Link href={`/events/${e.slug}`} className="block overflow-hidden rounded-md border border-line">
            <div className="relative aspect-[16/8] bg-mist"><ArtImage src={e.heroImage} alt={e.cityName} /></div>
            <div className="p-4">
              <p className="text-xs text-muted">{e.cityName}, {e.cityState} · {e.venue}</p>
              <p className="text-lg font-bold">{e.title}</p>
              <p className="text-xs">{eventDate(e.startsAt)}</p>
            </div>
          </Link>
          <div className="mt-2 grid grid-cols-3 gap-2 text-center text-xs font-semibold">
            <Link href={`/events/${e.slug}/photos`} className="rounded-full bg-fog py-2">Photo wall</Link>
            <Link href={`/events/${e.slug}/details`} className="rounded-full bg-fog py-2">Scoreboard</Link>
            <Link href={`/events/${e.slug}/menu`} className="rounded-full bg-fog py-2">Food + drink</Link>
          </div>
        </li>
      ))}
    </ul>
  );
}
