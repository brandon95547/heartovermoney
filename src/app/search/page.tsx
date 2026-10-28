// Search, in the section it was opened from (the client's navigation, October 2026): on
// Products it finds art, merch and shoes, auction lots, collections and artists, with filters;
// on Posts (`?in=posts`) it finds posts, events and stories. It never switches sections.
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Search as SearchIcon } from "lucide-react";
import { ArtImage } from "@/components/art-image";
import { ArtworkCard, LotCard } from "@/components/cards";
import { Empty, PageHeader, SectionLabel, Skeleton } from "@/components/ui";
import { eventDate, filmKindLabel } from "@/lib/format";
import { search, searchPosts, type SearchFilters } from "@/lib/queries";

export const metadata: Metadata = { title: "Search" };

export default function SearchPage(props: PageProps<"/search">) {
  return (
    <main>
      <PageHeader title="Search" />
      <div className="p-5">
        <Suspense fallback={<input name="q" placeholder="Search" className="mb-6 h-12 w-full rounded-full bg-fog pl-11 pr-4 text-sm outline-none" />}>
          <SearchForm searchParams={props.searchParams} />
        </Suspense>
        <Suspense fallback={<Skeleton className="h-64" />}><Results searchParams={props.searchParams} /></Suspense>
      </div>
    </main>
  );
}

type SP = PageProps<"/search">["searchParams"];
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v ?? "");
async function read(sp: SP) {
  const p = await sp;
  const type = one(p.type);
  return {
    posts: one(p.in) === "posts",
    q: one(p.q).trim().slice(0, 60),
    filters: {
      available: one(p.available) === "1",
      type: type === "art" || type === "merch" || type === "shoes" ? type : undefined,
    } satisfies SearchFilters,
  };
}

const TYPES = [["", "All"], ["art", "Fine art"], ["merch", "Merch"], ["shoes", "Shoes"]] as const;

// A plain GET form, so a search and its filters are a link that can be shared.
async function SearchForm({ searchParams }: { searchParams: SP }) {
  const { posts, q, filters } = await read(searchParams);
  return (
    <form action="/search" role="search" className="mb-6 space-y-3">
      {posts && <input type="hidden" name="in" value="posts" />}
      <div className="relative">
        <SearchIcon className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted" />
        <input name="q" defaultValue={q} placeholder={posts ? "Posts, people, events, stories" : "Art, artists, collections"} autoFocus aria-label="Search"
          className="h-12 w-full rounded-full bg-fog pl-11 pr-4 text-sm outline-none focus:ring-2 focus:ring-ink/20" />
      </div>
      {posts ? (
        <p className="text-xs text-muted">Searching Posts. <Link href={q ? `/search?q=${encodeURIComponent(q)}` : "/search"} className="font-semibold underline">Search products instead</Link></p>
      ) : (
        <fieldset className="flex flex-wrap items-center gap-2 text-xs">
          <legend className="sr-only">Filters</legend>
          {TYPES.map(([value, label]) => (
            <label key={value} className="cursor-pointer">
              <input type="radio" name="type" value={value} defaultChecked={(filters.type ?? "") === value} className="peer sr-only" />
              <span className="block rounded-full border border-line px-3 py-1.5 font-semibold peer-checked:border-ink peer-checked:bg-ink peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-ink/30">{label}</span>
            </label>
          ))}
          <label className="ml-1 flex cursor-pointer items-center gap-1.5 font-semibold">
            <input type="checkbox" name="available" value="1" defaultChecked={filters.available} className="size-4 accent-ink" />
            Available only
          </label>
          <button className="ml-auto rounded-full bg-ink px-4 py-1.5 font-bold text-white">Search</button>
        </fieldset>
      )}
    </form>
  );
}

async function Results({ searchParams }: { searchParams: SP }) {
  const { posts, q, filters } = await read(searchParams);
  if (!q) {
    return <p className="text-sm text-muted">{posts ? "Search the photos people post, the events and the stories." : "Search the collections, artists, merch, shoes and auction lots."}</p>;
  }
  return posts ? <PostsResults q={q} /> : <ProductResults q={q} filters={filters} />;
}

const chip = "rounded-full bg-fog px-4 py-2 text-sm font-semibold";

async function ProductResults({ q, filters }: { q: string; filters: SearchFilters }) {
  const r = await search(q, filters);
  const now = new Date();
  if (!r.artworks.length && !r.lots.length && !r.cities.length && !r.artists.length) {
    return <Empty>Nothing matches “{q}”{filters.available || filters.type ? " with these filters" : ""}.</Empty>;
  }
  return (
    <div className="space-y-8">
      {r.artists.length > 0 && (
        <section><SectionLabel className="mb-2">Artists</SectionLabel>
          <ul className="flex flex-wrap gap-2">{r.artists.map((a) => <li key={a.slug}><Link href={`/artists/${a.slug}`} className={chip}>{a.name}</Link></li>)}</ul>
        </section>
      )}
      {r.cities.length > 0 && (
        <section><SectionLabel className="mb-2">Collections</SectionLabel>
          <ul className="flex flex-wrap gap-2">{r.cities.map((c) => <li key={c.slug}><Link href={`/cities/${c.slug}`} className={chip}>{c.name}, {c.state}</Link></li>)}</ul>
        </section>
      )}
      {r.artworks.length > 0 && (
        <section><SectionLabel className="mb-3">Art and products</SectionLabel>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">{r.artworks.map((a) => <ArtworkCard key={a.slug} a={a} wide />)}</div>
        </section>
      )}
      {r.lots.length > 0 && (
        <section><SectionLabel className="mb-3">Auction lots</SectionLabel>
          <div className="flex flex-wrap gap-4">{r.lots.map((l) => <LotCard key={l.id} l={l} now={now} />)}</div>
        </section>
      )}
    </div>
  );
}

async function PostsResults({ q }: { q: string }) {
  const r = await searchPosts(q);
  if (!r.photos.length && !r.events.length && !r.films.length) return <Empty>Nothing in Posts matches “{q}”.</Empty>;
  return (
    <div className="space-y-8">
      {r.photos.length > 0 && (
        <section><SectionLabel className="mb-3">Posts</SectionLabel>
          <ul className="grid grid-cols-3 gap-2">
            {r.photos.map((p) => (
              <li key={p.id}>
                <Link href={`/events/${p.eventSlug}/photos#${p.id}`} className="block">
                  <span className="relative block aspect-[9/16] overflow-hidden rounded-sm bg-mist"><ArtImage src={p.image} alt={p.caption || `Photo by @${p.username}`} sizes="140px" /></span>
                  <span className="mt-1 block truncate text-xs font-semibold">@{p.username}</span>
                  <span className="block truncate text-[11px] text-muted">{p.caption || p.eventTitle}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      {r.events.length > 0 && (
        <section><SectionLabel className="mb-2">Events</SectionLabel>
          <ul className="divide-y divide-line">{r.events.map((e) => (
            <li key={e.slug}><Link href={`/events/${e.slug}`} className="block py-3 text-sm"><b>{e.title}</b> · {e.cityName}<span className="block text-xs text-muted">{eventDate(e.startsAt)}</span></Link></li>
          ))}</ul>
        </section>
      )}
      {r.films.length > 0 && (
        <section><SectionLabel className="mb-2">Stories</SectionLabel>
          <ul className="divide-y divide-line">{r.films.map((f) => (
            <li key={f.slug}><Link href={`/films/${f.slug}`} className="block py-3 text-sm"><b>{f.title}</b><span className="block text-xs text-muted">{filmKindLabel[f.kind]}</span></Link></li>
          ))}</ul>
        </section>
      )}
    </div>
  );
}
