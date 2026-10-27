// Every change made in the admin panel, newest first, with who made it and why.
import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminTitle } from "@/components/admin-ui";
import { Empty, Skeleton } from "@/components/ui";
import { requireAdmin } from "@/lib/admin";
import { listActivity } from "@/lib/admin-queries";

export const metadata: Metadata = { title: "Activity" };

export default function ActivityPage() {
  return (
    <main className="p-5">
      <AdminTitle title="Activity" />
      <Suspense fallback={<Skeleton className="h-64" />}><Activity /></Suspense>
    </main>
  );
}

async function Activity() {
  await requireAdmin("/admin/activity");
  const rows = await listActivity();
  if (!rows.length) return <Empty>No changes yet. Every change made in the admin panel is listed here.</Empty>;
  return (
    <ul className="divide-y divide-line">
      {rows.map((a) => (
        <li key={a.id} className="py-3 text-sm">
          <p><b>@{a.actor ?? "deleted"}</b> {a.action} <span className="font-semibold">{a.target}</span></p>
          {a.detail && <p className="text-muted">{a.detail}</p>}
          <p className="text-xs text-muted">{a.at.toLocaleString("en-US", { timeZone: "America/New_York", dateStyle: "medium", timeStyle: "short" })}</p>
        </li>
      ))}
    </ul>
  );
}
