// Everyone with an account: their role and membership, filtered and searched.
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AdminTitle, Pill, TextField } from "@/components/admin-ui";
import { Empty, Skeleton } from "@/components/ui";
import { requireAdmin } from "@/lib/admin";
import { listMembers, type MemberFilter } from "@/lib/admin-queries";
import { CLUB_SEATS, isSuperOptimistic, isVipMember, tierById } from "@/lib/membership";
import { clubSeatsTaken } from "@/lib/queries";

export const metadata: Metadata = { title: "Members" };

const FILTERS = [["all", "Everyone"], ["vip", "VIPs"], ["club", "700 Club"], ["admin", "Admins"]] as const;

export default function MembersPage(props: PageProps<"/admin/members">) {
  return (
    <main className="p-5">
      <AdminTitle title="Members" />
      <Suspense fallback={<Skeleton className="h-96" />}><Members searchParams={props.searchParams} /></Suspense>
    </main>
  );
}

async function Members({ searchParams }: { searchParams: PageProps<"/admin/members">["searchParams"] }) {
  await requireAdmin("/admin/members");
  const sp = await searchParams;
  const filter = (FILTERS.find(([v]) => v === sp.show)?.[0] ?? "all") as MemberFilter;
  const q = typeof sp.q === "string" ? sp.q.trim().slice(0, 60) : "";
  const [members, seats] = await Promise.all([listMembers(filter, q), clubSeatsTaken()]);
  return (
    <div className="space-y-5">
      <p className="text-sm"><b>{seats}</b> of {CLUB_SEATS} seats taken in the 700 Club.</p>
      <form action="/admin/members" className="flex items-end gap-3">
        <input type="hidden" name="show" value={filter} />
        <div className="flex-1"><TextField label="Search" name="q" defaultValue={q} placeholder="Name, username or email" /></div>
        <button className="rounded-full bg-ink px-4 py-3 text-xs font-bold text-white">Search</button>
      </form>
      <div className="flex gap-2">
        {FILTERS.map(([v, label]) => (
          <Link key={v} href={`/admin/members?show=${v}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${filter === v ? "border-ink bg-ink text-white" : "border-line"}`}>{label}</Link>
        ))}
      </div>
      {members.length ? (
        <ul className="divide-y divide-line">
          {members.map((m) => {
            const vip = isVipMember(m.role, m.tier);
            return (
              <li key={m.id}>
                <Link href={`/admin/members/${m.id}`} className="flex items-center justify-between gap-3 py-3 text-sm">
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">{m.displayName} <span className="font-normal text-muted">@{m.username}</span></span>
                    <span className="block truncate text-xs text-muted">{m.email}</span>
                  </span>
                  <span className="flex shrink-0 flex-wrap justify-end gap-1">
                    {m.role === "admin" && <Pill tone="ink">Admin</Pill>}
                    {m.tier ? <Pill tone="vip">{tierById(m.tier)?.name}</Pill> : m.role === "vip" ? <Pill tone="vip">VIP (complimentary)</Pill> : !vip && <Pill>Member</Pill>}
                    {isSuperOptimistic(m.tier, m.pieces) && <Pill tone="go">Super Optimistic</Pill>}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : <Empty>No one matches.</Empty>}
    </div>
  );
}
