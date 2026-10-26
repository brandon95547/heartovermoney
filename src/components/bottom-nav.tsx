"use client";

// The bottom navigation (screen design page 27). Home, Search and Profile stay put; the
// center button shows which side you are on, Posts (♥) or Products ($), and opens a menu to
// switch sides or reach the Vault and Settings. Home is the side's main screen: the photo
// feed for Posts, the products page (page 24) for Products. The right-hand button follows the
// side: Chat for Posts, Cart for Products.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  House, Search, Heart, CircleDollarSign, CircleMinus, User, MessageSquareMore, ShoppingCart, Lock, Settings,
} from "lucide-react";

const POSTS_PATHS = ["/posts", "/events", "/chat"];
const HIDDEN_ON = ["/signin", "/signup"];

export function BottomNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  // /events itself is the full-screen card process; the event's own pages keep the nav.
  if (pathname === "/events" || HIDDEN_ON.some((p) => pathname.startsWith(p))) return null;

  const posts = POSTS_PATHS.some((p) => pathname.startsWith(p));
  const dark = /^\/(posts|events\/[^/]+\/photos)\/?$/.test(pathname);
  const Center = open ? CircleMinus : posts ? Heart : CircleDollarSign;

  const item = (href: string, label: string, Icon: typeof House, active = pathname === href) => (
    <Link href={href} aria-label={label} aria-current={active ? "page" : undefined}
      onClick={() => setOpen(false)}
      className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] ${active ? "font-semibold" : "opacity-80"}`}>
      <Icon className="size-6" strokeWidth={active ? 2.25 : 1.75} />
      <span>{label}</span>
    </Link>
  );

  return (
    <nav className={`fixed inset-x-0 bottom-0 z-40 pb-[env(safe-area-inset-bottom)] ${dark ? "bg-black/80 text-white backdrop-blur" : "border-t border-line bg-paper text-ink"}`}>
      {open && (
        <div className="absolute inset-x-0 bottom-full mx-auto flex max-w-md justify-around border-t border-line bg-paper px-2 py-3 text-ink shadow-lg md:max-w-2xl">
          {[
            ["/vault", "Vault", Lock],
            ["/posts", "Posts", Heart],
            ["/", "Products", CircleDollarSign],
            ["/settings", "Settings", Settings],
          ].map(([href, label, Icon]) => {
            const I = Icon as typeof House;
            return (
              <Link key={label as string} href={href as string} onClick={() => setOpen(false)}
                className="flex w-20 flex-col items-center gap-1 rounded-lg py-2 text-xs hover:bg-fog">
                <I className="size-6" strokeWidth={1.75} />
                {label as string}
              </Link>
            );
          })}
        </div>
      )}
      <div className="mx-auto flex max-w-md items-stretch md:max-w-2xl">
        {item(posts ? "/posts" : "/", "Home", House)}
        {item("/search", "Search", Search)}
        <button type="button" aria-label={posts ? "Posts menu" : "Products menu"} aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          className="flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-semibold">
          <Center className="size-7" strokeWidth={1.75} />
          <span>{posts ? "Posts" : "Products"}</span>
        </button>
        {item("/profile", "Profile", User)}
        {posts ? item("/chat", "Chat", MessageSquareMore) : item("/cart", "Cart", ShoppingCart)}
      </div>
    </nav>
  );
}
