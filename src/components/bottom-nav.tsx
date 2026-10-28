"use client";

// The bottom navigation, as agreed with the client (October 2026): five icons, nothing that
// opens above them. Home, Search and Profile keep their places; the center icon is the way to
// the other section (a heart on Products, to Posts; a dollar sign on Posts, back to Products),
// and the right-hand icon follows the section (Cart on Products, Chat on Posts). Home goes to
// the current section's homepage: the products page, or for Posts the current event's
// Overview (`postsHome`). Search searches the current section. Icons only, as in the designs,
// each named for screen readers, and on every page, fixed to the bottom of the screen.
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { House, Search, Heart, DollarSign, User, MessageSquareMore, ShoppingCart } from "lucide-react";
import { SECTION_COOKIE, sectionOf, type Section } from "@/lib/sections";

// The center icons are drawn in a circle, as in the designs.
function Circled({ children }: { children: React.ReactNode }) {
  return <span className="flex size-8 items-center justify-center rounded-full border-2 border-current">{children}</span>;
}

export function BottomNav({ lastSection, postsHome }: { lastSection: Section; postsHome: string }) {
  const pathname = usePathname();
  const searchIn = useSearchParams().get("in");
  const here = sectionOf(pathname, searchIn);
  // The section of the last page that had one, for the pages shared by both: kept here while
  // the visitor moves around, and in a cookie for the next full page load.
  const [remembered, setRemembered] = useState<Section>(lastSection);
  if (here && here !== remembered) setRemembered(here);
  useEffect(() => {
    if (here) document.cookie = `${SECTION_COOKIE}=${here}; path=/; max-age=31536000; samesite=lax`;
  }, [here]);

  const posts = (here ?? remembered) === "posts";
  const dark = /^\/events\/[^/]+\/photos\/?$/.test(pathname);
  const home = posts ? postsHome : "/";

  const item = (href: string, label: string, Icon: typeof House, active: boolean) => (
    <Link href={href} aria-label={label} aria-current={active ? "page" : undefined} title={label}
      className={`flex flex-1 items-center justify-center py-4 ${active ? "" : "opacity-75"}`}>
      <Icon className="size-7" strokeWidth={active ? 2 : 1.5} />
    </Link>
  );

  return (
    <nav aria-label="Main" className={`fixed inset-x-0 bottom-0 z-40 pb-[env(safe-area-inset-bottom)] ${dark ? "bg-black/80 text-white backdrop-blur" : "border-t border-line bg-paper text-ink"}`}>
      <div className="mx-auto flex max-w-md items-stretch md:max-w-2xl">
        {item(home, "Home", House, pathname === home)}
        {item(posts ? "/search?in=posts" : "/search", "Search", Search, pathname === "/search")}
        {posts ? (
          <Link href="/" aria-label="Go to Products" title="Products" className="flex flex-1 items-center justify-center py-4">
            <Circled><DollarSign className="size-4" strokeWidth={2.5} /></Circled>
          </Link>
        ) : (
          <Link href={postsHome} aria-label="Go to Posts" title="Posts" className="flex flex-1 items-center justify-center py-4">
            <Circled><Heart className="size-4 fill-current" strokeWidth={0} /></Circled>
          </Link>
        )}
        {item("/profile", "Profile", User, pathname.startsWith("/profile") || pathname === "/settings")}
        {posts ? item("/chat", "Chat", MessageSquareMore, pathname === "/chat") : item("/cart", "Cart", ShoppingCart, pathname === "/cart")}
      </div>
    </nav>
  );
}
