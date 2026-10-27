"use client";

// The admin panel's sections, as tabs across the top.
import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  ["/admin", "Dashboard"], ["/admin/orders", "Orders"], ["/admin/art", "Art"], ["/admin/editions", "Editions"],
  ["/admin/events", "Events"], ["/admin/cards", "Cards"], ["/admin/auctions", "Auctions"], ["/admin/members", "Members"],
  ["/admin/content", "Content"], ["/admin/photos", "Photos"], ["/admin/messages", "Messages"], ["/admin/check-in", "Check-in"],
  ["/admin/activity", "Activity"],
] as const;

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Admin" className="sticky top-0 z-30 border-b border-line bg-paper/95 backdrop-blur">
      <div className="flex items-center justify-between px-5 pt-3">
        <p className="text-xs font-bold uppercase tracking-[0.2em]">Admin</p>
        <Link href="/" className="text-xs font-semibold underline">View the site</Link>
      </div>
      <ul className="flex gap-1 overflow-x-auto px-3 py-2 [scrollbar-width:none]">
        {TABS.map(([href, label]) => {
          const current = href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
          return (
            <li key={href} className="shrink-0">
              <Link href={href} aria-current={current ? "page" : undefined}
                className={`block rounded-full px-3 py-1.5 text-xs font-semibold ${current ? "bg-ink text-white" : "text-charcoal hover:bg-fog"}`}>{label}</Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
