// Events, the newest first: when and where, how many are registered, and what it has raised.
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AdminTitle, Pill, adminLink } from "@/components/admin-ui";
import { Empty, Skeleton } from "@/components/ui";
import { requireAdmin } from "@/lib/admin";
import { listAdminEvents } from "@/lib/admin-queries";
import { eventDate, money } from "@/lib/format";

export const metadata: Metadata = { title: "Events" };

export default function AdminEventsPage() {
  return (
    <main className="p-5">
      <AdminTitle title="Events" action={<Link href="/admin/events/new" className={adminLink}>+ New event</Link>} />
      <Suspense fallback={<Skeleton className="h-64" />}><Events /></Suspense>
    </main>
  );
}

async function Events() {
  await requireAdmin("/admin/events");
  const events = await listAdminEvents();
  const now = new Date();
  if (!events.length) return <Empty>No events yet.</Empty>;
  return (
    <ul className="divide-y divide-line">
      {events.map((e) => (
        <li key={e.id}>
          <Link href={`/admin/events/${e.id}`} className="block py-3 text-sm">
            <span className="flex items-center gap-2 font-semibold">{e.title} · {e.cityName} {e.startsAt > now ? <Pill tone="vip">Upcoming</Pill> : <Pill>Past</Pill>}</span>
            <span className="block text-xs text-muted">{eventDate(e.startsAt)} · {e.venue}</span>
            <span className="block text-xs">{e.registered} registered of {e.cards} cards · raised {money(e.revenue)}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
