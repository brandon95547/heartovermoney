// heartovermoney.com/events, the link on the cards handed out before an event: the card process
// for the next event. One event runs at a time. Signing in comes first (development overview
// page 2); someone already registered goes on to the event itself.
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { buttonClass } from "@/components/ui";
import { requireUser } from "@/lib/dal";
import { eventDate } from "@/lib/format";
import { getNextEvent, getRegistration, listCardOptions } from "@/lib/queries";
import { CardProcess } from "./card-process";

export const metadata: Metadata = { title: "The next event" };

export default function NextEventPage(props: PageProps<"/events">) {
  return (
    <main className="chevrons fixed inset-0 z-50 mx-auto flex max-w-md flex-col text-white md:max-w-2xl">
      <div className="flex justify-end p-4"><Link href="/" className="text-sm">Skip</Link></div>
      <Suspense fallback={<div className="flex-1" />}><Registration searchParams={props.searchParams} /></Suspense>
    </main>
  );
}

// `?for=chat`: sent from the Chat icon, which opens once the guest is registered.
async function Registration({ searchParams }: { searchParams: PageProps<"/events">["searchParams"] }) {
  const event = await getNextEvent();
  if (!event) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-6 px-8 text-center">
        <p className="text-2xl font-bold">The next event is on its way</p>
        <p className="text-sm text-white/80">Check back soon for the city and the date.</p>
        <Link href="/" className={buttonClass("outline", "border-white text-white hover:bg-white/10")}>See the collection</Link>
      </div>
    );
  }
  const forChat = (await searchParams).for === "chat";
  const user = await requireUser(forChat ? "/chat" : "/events");
  if (await getRegistration(event.id, user.id)) redirect(forChat ? "/chat" : `/events/${event.slug}`);
  const options = await listCardOptions(event.id);
  return (
    <CardProcess
      event={{ id: event.id, slug: event.slug, title: event.title, place: `${event.cityName}, ${event.cityState}`, when: eventDate(event.startsAt) }}
      options={options.map((o) => o.design)} tagline={user.tagline ?? ""} shipAddress={user.shipAddress ?? ""} vipMember={user.isVip} forChat={forChat} />
  );
}
