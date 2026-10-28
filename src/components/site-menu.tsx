// ☰ and the site menu, with the signed-in person read on the server. Reads cookies, so it
// renders inside <Suspense>; `SiteMenuFallback` holds its place meanwhile.
import { Menu } from "lucide-react";
import { MenuDrawer } from "@/components/menu-drawer";
import { getUser } from "@/lib/dal";
import { getNextEvent } from "@/lib/queries";

export async function SiteMenu({ tone = "light" }: { tone?: "light" | "dark" }) {
  const [user, event] = await Promise.all([getUser(), getNextEvent()]);
  return (
    <MenuDrawer tone={tone} postsHref={event ? `/events/${event.slug}` : "/events"}
      person={user && { displayName: user.displayName, tagline: user.tagline, isVip: user.isVip }} />
  );
}

export function SiteMenuFallback({ tone = "light" }: { tone?: "light" | "dark" }) {
  return (
    <span aria-hidden className={`flex size-10 items-center justify-center rounded-full ${tone === "dark" ? "bg-black/40 text-white" : "text-ink"}`}>
      <Menu className="size-6" strokeWidth={1.5} />
    </span>
  );
}
