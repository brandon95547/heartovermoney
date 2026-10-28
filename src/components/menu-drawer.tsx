"use client";

// The site menu behind ☰ (the blueprint's secondary navigation, laid out like screen design
// page 16): the mark and a search field at the top, the sections of the site, and the person
// signed in at the bottom. A native <dialog>, so Escape closes it and focus stays inside.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef } from "react";
import { ChevronRight, Menu, Search, X } from "lucide-react";
import { Logo } from "@/components/logo";

export type MenuPerson = { displayName: string; tagline: string | null; isVip: boolean } | null;

// Posts is the current event's Overview (its photos are the posts); `postsHref` is its address.
const sections = (postsHref: string) => [
  { title: "Shop", links: [["/", "Home"], ["/cities", "Collections"], ["/auctions", "Auctions"], ["/membership", "Membership"]] },
  { title: "Events & stories", links: [[postsHref, "Posts"], ["/events", "Get your card"], ["/films", "Films"], ["/mission", "The mission"]] },
  { title: "More", links: [["/about", "About"], ["/contact", "Contact"]] },
] as const;

export function MenuDrawer({ person, postsHref, tone = "light" }: { person: MenuPerson; postsHref: string; tone?: "light" | "dark" }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const pathname = usePathname();
  const close = () => dialog.current?.close();
  return (
    <>
      <button type="button" onClick={() => dialog.current?.showModal()} aria-label="Menu" aria-haspopup="dialog"
        className={`flex size-10 items-center justify-center rounded-full ${tone === "dark" ? "bg-black/40 text-white" : "text-ink hover:bg-fog"}`}>
        <Menu className="size-6" strokeWidth={1.5} />
      </button>
      <dialog ref={dialog} aria-label="Menu" onClick={(e) => { if (e.target === dialog.current) close(); }}
        className="my-0 mr-0 ml-[max(0px,calc((100vw-28rem)/2))] h-dvh max-h-none w-[85%] max-w-sm bg-paper md:ml-[calc((100vw-42rem)/2)] p-0 text-ink backdrop:bg-black/50 open:flex open:flex-col">
        <div className="flex items-center gap-3 border-b border-line p-4">
          <Link href="/" onClick={close} aria-label="Heart Over Money home" className="flex size-11 shrink-0 items-center justify-center rounded-md bg-ink">
            <Logo size={30} reversed />
          </Link>
          <form action="/search" role="search" onSubmit={close} className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <input name="q" placeholder="Search art, artists, cities" aria-label="Search"
              className="h-11 w-full rounded-md bg-fog pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ink/20" />
          </form>
          <button type="button" onClick={close} aria-label="Close menu" className="flex size-9 items-center justify-center rounded-full hover:bg-fog">
            <X className="size-5" strokeWidth={1.5} />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto py-2">
          {sections(postsHref).map((section) => (
            <div key={section.title} className="px-4 py-3">
              <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.14em] text-muted">{section.title}</p>
              <ul>
                {section.links.map(([href, label]) => {
                  const current = href === "/" ? pathname === "/" : href === "/events" ? pathname === "/events" : pathname.startsWith(href);
                  return (
                    <li key={href}>
                      <Link href={href} onClick={close} aria-current={current ? "page" : undefined}
                        className={`block rounded-md px-3 py-2.5 text-sm uppercase tracking-wide ${current ? "bg-ink font-semibold text-white" : "hover:bg-fog"}`}>
                        {label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
        <div className="border-t border-line p-4">
          {person ? (
            <>
              <Link href="/profile" onClick={close} className="flex items-center gap-3">
                <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-ink text-lg font-bold text-white">{person.displayName[0]}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{person.displayName}</span>
                  {person.tagline && <span className="block truncate text-sm text-muted">{person.tagline}</span>}
                </span>
                <ChevronRight className="size-5 shrink-0" />
              </Link>
              {person.isVip
                ? <p className="mt-3 rounded-md bg-vip/10 px-3 py-2 text-center text-sm text-vip">You&apos;re a VIP: the art is open to you.</p>
                : <Link href="/membership" onClick={close} className="mt-3 block rounded-md bg-vip/10 px-3 py-2 text-center text-sm text-vip">Become a VIP from $25 a month</Link>}
            </>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <Link href={`/signin?next=${encodeURIComponent(pathname)}`} onClick={close} className="flex h-11 items-center justify-center rounded-full bg-ink text-sm font-bold text-white">Sign in</Link>
              <Link href={`/signup?next=${encodeURIComponent(pathname)}`} onClick={close} className="flex h-11 items-center justify-center rounded-full border border-ink text-sm font-bold">Create account</Link>
            </div>
          )}
        </div>
      </dialog>
    </>
  );
}
