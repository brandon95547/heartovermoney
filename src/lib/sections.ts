// The site's two sections (the client's navigation, October 2026): Products (shopping,
// artwork, collections, auctions) and Posts (community posts, events, photos, connections).
// Pages that belong to neither (Profile, Settings, the Vault, the stories) keep the section
// the visitor came from, remembered in a cookie so a reload keeps it too.
export type Section = "products" | "posts";

export const SECTION_COOKIE = "hom_section";

const POSTS = ["/posts", "/events", "/chat"];
const PRODUCTS = ["/art", "/artists", "/cities", "/auctions", "/cart"];

// The section a page belongs to, or null for a page shared by both. Search belongs to the
// section it was opened from (`?in=posts`).
export function sectionOf(pathname: string, searchIn?: string | null): Section | null {
  if (pathname === "/search") return searchIn === "posts" ? "posts" : "products";
  if (pathname === "/") return "products";
  if (POSTS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return "posts";
  if (PRODUCTS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return "products";
  return null;
}
