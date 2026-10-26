import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Search as SearchIcon } from "lucide-react";
import { ArtworkCard, LotCard } from "@/components/cards";
import { Empty, PageHeader, SectionLabel, Skeleton } from "@/components/ui";
import { search } from "@/lib/queries";

export const metadata: Metadata = { title: "Search" };

export default function SearchPage(props: PageProps<"/search">) {
  return (
    <main>
      <PageHeader title="Search" />
      <div className="p-5">
        <form action="/search" role="search" className="relative mb-6">
          <SearchIcon className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <Suspense fallback={<input name="q" placeholder="Art, artists, cities" className="h-12 w-full rounded-full bg-fog pl-11 pr-4 text-sm outline-none" />}>
            <SearchBox searchParams={props.searchParams} />
          </Suspense>
        </form>
        <Suspense fallback={<Skeleton className="h-64" />}><Results searchParams={props.searchParams} /></Suspense>
      </div>
    </main>
  );
}

type SP = PageProps<"/search">["searchParams"];
const term = async (sp: SP) => {
  const q = (await sp).q;
  return (Array.isArray(q) ? q[0] : q ?? "").trim().slice(0, 60);
};

async function SearchBox({ searchParams }: { searchParams: SP }) {
  const q = await term(searchParams);
  return <input name="q" defaultValue={q} placeholder="Art, artists, cities" autoFocus
    className="h-12 w-full rounded-full bg-fog pl-11 pr-4 text-sm outline-none focus:ring-2 focus:ring-ink/20" />;
}

async function Results({ searchParams }: { searchParams: SP }) {
  const q = await term(searchParams);
  if (!q) return <p className="text-sm text-muted">Search the collections, artists, cities and auction lots.</p>;
  const r = await search(q);
  const now = new Date();
  if (!r.artworks.length && !r.lots.length && !r.cities.length) return <Empty>Nothing matches “{q}”.</Empty>;
  return (
    <div className="space-y-8">
      {r.cities.length > 0 && (
        <section><SectionLabel className="mb-2">Cities</SectionLabel>
          <ul className="flex flex-wrap gap-2">{r.cities.map((c) => <li key={c.slug}><Link href={`/cities/${c.slug}`} className="rounded-full bg-fog px-4 py-2 text-sm font-semibold">{c.name}, {c.state}</Link></li>)}</ul>
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
    </div>
  );
}
