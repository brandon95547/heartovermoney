// Search: art, artists, cities, events, films and auction lots, with filters for what's still
// available and the kind of piece.
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Search as SearchIcon } from "lucide-react";
import { ArtworkCard, LotCard } from "@/components/cards";
import { Empty, PageHeader, SectionLabel, Skeleton } from "@/components/ui";
import { eventDate, filmKindLabel } from "@/lib/format";
import { search, type SearchFilters } from "@/lib/queries";

export const metadata: Metadata = { title: "Search" };

export default function SearchPage(props: PageProps<"/search">) {
  return (
    <main>
      <PageHeader title="Search" />
      <div className="p-5">
        <Suspense fallback={<input name="q" placeholder="Art, artists, cities" className="mb-6 h-12 w-full rounded-full bg-fog pl-11 pr-4 text-sm outline-none" />}>
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
  const { q, filters } = await read(searchParams);
  return (
    <form action="/search" role="search" className="mb-6 space-y-3">
      <div className="relative">
        <SearchIcon className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted" />
        <input name="q" defaultValue={q} placeholder="Art, artists, cities, events, films" autoFocus aria-label="Search"
          className="h-12 w-full rounded-full bg-fog pl-11 pr-4 text-sm outline-none focus:ring-2 focus:ring-ink/20" />
      </div>
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
    </form>
  );
}

async function Results({ searchParams }: { searchParams: SP }) {
  const { q, filters } = await read(searchParams);
  if (!q) return <p className="text-sm text-muted">Search the collections, artists, cities, events, films and auction lots.</p>;
  const r = await search(q, filters);
  const now = new Date();
  const nothing = !r.artworks.length && !r.lots.length && !r.cities.length && !r.artists.length && !r.events.length && !r.films.length;
  if (nothing) return <Empty>Nothing matches “{q}”{filters.available || filters.type ? " with these filters" : ""}.</Empty>;
  const chip = "rounded-full bg-fog px-4 py-2 text-sm font-semibold";
  return (
    <div className="space-y-8">
      {r.artists.length > 0 && (
        <section><SectionLabel className="mb-2">Artists</SectionLabel>
          <ul className="flex flex-wrap gap-2">{r.artists.map((a) => <li key={a.slug}><Link href={`/artists/${a.slug}`} className={chip}>{a.name}</Link></li>)}</ul>
        </section>
      )}
      {r.cities.length > 0 && (
        <section><SectionLabel className="mb-2">Cities</SectionLabel>
          <ul className="flex flex-wrap gap-2">{r.cities.map((c) => <li key={c.slug}><Link href={`/cities/${c.slug}`} className={chip}>{c.name}, {c.state}</Link></li>)}</ul>
        </section>
      )}
      {r.artworks.length > 0 && (
        <section><SectionLabel className="mb-3">Art</SectionLabel>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">{r.artworks.map((a) => <ArtworkCard key={a.slug} a={a} wide />)}</div>
        </section>
      )}
      {r.lots.length > 0 && (
        <section><SectionLabel className="mb-3">Auction lots</SectionLabel>
          <div className="flex flex-wrap gap-4">{r.lots.map((l) => <LotCard key={l.id} l={l} now={now} />)}</div>
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
        <section><SectionLabel className="mb-2">Films</SectionLabel>
          <ul className="divide-y divide-line">{r.films.map((f) => (
            <li key={f.slug}><Link href={`/films/${f.slug}`} className="block py-3 text-sm"><b>{f.title}</b><span className="block text-xs text-muted">{filmKindLabel[f.kind]}</span></Link></li>
          ))}</ul>
        </section>
      )}
    </div>
  );
}
