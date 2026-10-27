// The admin dashboard: what needs doing (orders to hand over or ship, messages, photos the
// community removed), the next event at a glance, and the latest orders and changes.
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AdminTitle, Pill, Section, Stat, adminLink } from "@/components/admin-ui";
import { Skeleton } from "@/components/ui";
import { requireAdmin } from "@/lib/admin";
import { dashboard } from "@/lib/admin-queries";
import { eventDate, money } from "@/lib/format";
import { CLUB_SEATS } from "@/lib/membership";

export const metadata: Metadata = { title: "Admin" };

export default function AdminDashboardPage() {
  return (
    <main className="p-5">
      <AdminTitle title="Dashboard" />
      <Suspense fallback={<Skeleton className="h-96" />}><Dashboard /></Suspense>
    </main>
  );
}

async function Dashboard() {
  await requireAdmin("/admin");
  const d = await dashboard();
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <Stat label="Orders to hand over or ship" value={d.toFulfill} href="/admin/orders?status=open" />
        <Stat label="Messages to answer" value={d.messages} href="/admin/messages" />
        <Stat label="Photos removed by the community" value={d.removed} href="/admin/photos" />
        <Stat label="Numbered pieces collected" value={d.sold} href="/admin/editions" />
        <Stat label="Auction lots open" value={d.openLots} href="/admin/auctions" />
        <Stat label={`VIP members · 700 Club ${d.club} of ${CLUB_SEATS}`} value={d.vips} href="/admin/members" />
      </div>
      {d.next && (
        <Section title="The next event" action={<Link href={`/admin/events/${d.next.id}`} className={adminLink}>Edit</Link>}>
          <div className="rounded-md border border-line p-4 text-sm">
            <p className="font-bold">{d.next.title} · {d.next.cityName}</p>
            <p className="text-xs text-muted">{eventDate(d.next.startsAt)}</p>
            <p className="mt-2">{d.next.registered} registered · {d.next.checkedIn} checked in · {d.next.cardsLeft} cards left</p>
            <div className="mt-2 flex gap-4">
              <Link href={`/admin/cards?event=${d.next.id}`} className={adminLink}>Cards</Link>
              <Link href="/admin/check-in" className={adminLink}>Door check-in</Link>
              <Link href={`/events/${d.next.slug}/details`} className={adminLink}>Scoreboard</Link>
            </div>
          </div>
        </Section>
      )}
      <Section title="Latest orders" action={<Link href="/admin/orders" className={adminLink}>All orders</Link>}>
        <ul className="divide-y divide-line">
          {d.recent.map((o) => (
            <li key={o.id}>
              <Link href={`/admin/orders/${o.id}`} className="flex items-center justify-between gap-3 py-3 text-sm">
                <span className="min-w-0">
                  <span className="block truncate font-semibold">{o.items}</span>
                  <span className="text-xs text-muted">@{o.username} · {o.createdAt.toLocaleDateString("en-US", { timeZone: "America/New_York" })}</span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block font-semibold">{money(o.totalCents)}</span>
                  {o.status === "refunded" ? <Pill tone="alert">Refunded</Pill> : o.fulfilledAt ? <Pill tone="go">Done</Pill> : <Pill>{o.kind}</Pill>}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Section>
      <Section title="Latest changes" action={<Link href="/admin/activity" className={adminLink}>All activity</Link>}>
        {d.activity.length ? (
          <ul className="space-y-2 text-sm">
            {d.activity.map((a) => <li key={a.id}><b>@{a.actor ?? "deleted"}</b> {a.action} <span className="text-muted">{a.target}</span></li>)}
          </ul>
        ) : <p className="text-sm text-muted">Changes made here are listed, with who made them.</p>}
      </Section>
    </div>
  );
}
