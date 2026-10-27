// One event: its details, its food and drink menu, and links to its cards, lots and scoreboard.
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { addMenuItem, deleteEvent, removeMenuItem } from "@/app/actions/admin/events";
import { AdminForm } from "@/components/admin-form";
import { AdminTitle, MoneyField, Section, TextField, adminLink } from "@/components/admin-ui";
import { Skeleton } from "@/components/ui";
import { requireAdmin } from "@/lib/admin";
import { isUuid } from "@/lib/admin-forms";
import { getAdminEvent, listAllCities } from "@/lib/admin-queries";
import { money } from "@/lib/format";
import { EventForm } from "../event-form";

export const metadata: Metadata = { title: "Event" };

export default function AdminEventPage(props: PageProps<"/admin/events/[id]">) {
  return (
    <main className="p-5">
      <AdminTitle title="Event" back={{ href: "/admin/events", label: "Events" }} />
      <Suspense fallback={<Skeleton className="h-96" />}><Event params={props.params} /></Suspense>
    </main>
  );
}

async function Event({ params }: { params: PageProps<"/admin/events/[id]">["params"] }) {
  const { id } = await params;
  await requireAdmin(`/admin/events/${id}`);
  const found = isUuid(id) ? await getAdminEvent(id) : null;
  if (!found) notFound();
  const { event, menu } = found;
  return (
    <div className="space-y-10">
      <div className="flex flex-wrap gap-4">
        <Link href={`/events/${event.slug}`} className={adminLink}>View on the site</Link>
        <Link href={`/events/${event.slug}/details`} className={adminLink}>Scoreboard</Link>
        <Link href={`/admin/cards?event=${event.id}`} className={adminLink}>Collector cards</Link>
        <Link href={`/admin/auctions?event=${event.id}`} className={adminLink}>Auction lots</Link>
      </div>
      <EventForm event={event} cities={await listAllCities()} />
      <Section title="Food and drink menu">
        <ul className="divide-y divide-line">
          {menu.map((m) => (
            <li key={m.id} className="flex items-center justify-between gap-3 py-2 text-sm">
              <span><b>{m.name}</b> <span className="text-xs text-muted">{m.category}</span></span>
              <span className="flex items-center gap-3">
                {money(m.priceCents, { cents: true })}
                <AdminForm action={removeMenuItem} submit="Remove" variant="outline" className="[&_button]:h-8 [&_button]:px-3 [&_button]:text-xs">
                  <input type="hidden" name="id" value={m.id} />
                </AdminForm>
              </span>
            </li>
          ))}
          {!menu.length && <li className="py-2 text-sm text-muted">Nothing on the menu yet.</li>}
        </ul>
        <AdminForm action={addMenuItem} submit="Add to the menu" variant="outline">
          <input type="hidden" name="eventId" value={event.id} />
          <div className="grid grid-cols-3 gap-3">
            <TextField label="Item" name="name" required maxLength={80} />
            <TextField label="Category" name="category" maxLength={40} placeholder="Food or Drinks" />
            <MoneyField label="Price" name="price" required />
          </div>
        </AdminForm>
      </Section>
      <Section title="Delete">
        <AdminForm action={deleteEvent} submit="Delete this event" variant="danger" confirmText={`Delete “${event.title}”? This can't be undone.`}>
          <input type="hidden" name="id" value={event.id} />
          <p className="text-sm text-muted">Only an event with no cards, lots, photos or sales can be deleted.</p>
        </AdminForm>
      </Section>
    </div>
  );
}
