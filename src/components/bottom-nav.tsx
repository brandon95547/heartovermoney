"use client";

// The bottom navigation (screen design page 27). Icons only, as in the designs; each keeps its
// name for screen readers. Home, Search and Profile stay put; the center button shows which
// side you are on, Posts (♥) or Products ($), and opens a menu to switch sides or reach the
// Vault and Settings, turning into ⊖ while it's open. Home is the side's main screen: the
// photo feed for Posts, the products page (page 24) for Products. The right-hand button follows
// the side: Chat for Posts, Cart for Products.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  House, Search, Heart, CircleDollarSign, User, MessageSquareMore, ShoppingCart, Lock, Settings, Minus, DollarSign,
} from "lucide-react";

const POSTS_PATHS = ["/posts", "/events", "/chat"];
// The scoreboard is the Products side in the designs (page 11), though it sits under the event.
const PRODUCTS_PATHS = [/^\/events\/[^/]+\/details/];
const HIDDEN_ON = ["/signin", "/signup", "/reset-password"];

// The center icons are drawn in a circle, as in the designs: a filled heart, a dollar sign, a minus.
function Circled({ children }: { children: React.ReactNode }) {
  return <span className="flex size-8 items-center justify-center rounded-full border-2 border-current">{children}</span>;
}

export function BottomNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  // /events itself is the full-screen card process; the event's own pages keep the nav.
  if (pathname === "/events" || HIDDEN_ON.some((p) => pathname.startsWith(p))) return null;

  const posts = POSTS_PATHS.some((p) => pathname.startsWith(p)) && !PRODUCTS_PATHS.some((r) => r.test(pathname));
  const dark = /^\/(posts|events\/[^/]+\/photos)\/?$/.test(pathname);
  const center = open ? <Minus className="size-4" strokeWidth={3} />
    : posts ? <Heart className="size-4 fill-current" strokeWidth={0} /> : <DollarSign className="size-4" strokeWidth={2.5} />;

  const item = (href: string, label: string, Icon: typeof House, active = pathname === href) => (
    <Link href={href} aria-label={label} aria-current={active ? "page" : undefined} title={label}
      onClick={() => setOpen(false)}
      className={`flex flex-1 items-center justify-center py-4 ${active ? "" : "opacity-75"}`}>
      <Icon className="size-7" strokeWidth={active ? 2 : 1.5} />
    </Link>
  );

  return (
    <nav aria-label="Main" className={`fixed inset-x-0 bottom-0 z-40 pb-[env(safe-area-inset-bottom)] ${dark ? "bg-black/80 text-white backdrop-blur" : "border-t border-line bg-paper text-ink"}`}>
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
                className="flex w-20 flex-col items-center gap-1 rounded-lg py-2 text-xs uppercase tracking-wide hover:bg-fog">
                <I className="size-6" strokeWidth={1.5} />
                {label as string}
              </Link>
            );
          })}
        </div>
      )}
      <div className="mx-auto flex max-w-md items-stretch md:max-w-2xl">
        {item(posts ? "/posts" : "/", "Home", House)}
        {item("/search", "Search", Search)}
        <button type="button" aria-label={open ? "Close menu" : posts ? "Posts menu" : "Products menu"} aria-expanded={open}
          title={posts ? "Posts" : "Products"} onClick={() => setOpen((o) => !o)}
          className="flex flex-1 items-center justify-center py-4">
          <Circled>{center}</Circled>
        </button>
        {item("/profile", "Profile", User)}
        {posts ? item("/chat", "Chat", MessageSquareMore) : item("/cart", "Cart", ShoppingCart)}
      </div>
    </nav>
  );
}
