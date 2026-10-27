// Every city the movement has visited, and the next one: each city's collection and story.
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ArtImage } from "@/components/art-image";
import { PageHeader, Skeleton } from "@/components/ui";
import { listCities } from "@/lib/queries";

export const metadata: Metadata = { title: "Collections" };

export default function CitiesPage() {
  return (
    <main>
      <PageHeader title="Collections" back="/" />
      <div className="space-y-4 p-5">
        <p className="text-sm text-muted">One city, one mission, one testimony, one limited art collection. Every piece is tied to the city it came from.</p>
        <Suspense fallback={<Skeleton className="h-96" />}><Cities /></Suspense>
      </div>
    </main>
  );
}

async function Cities() {
  const cities = await listCities();
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {cities.map((c) => (
        <Link key={c.slug} href={`/cities/${c.slug}`} className="relative block aspect-[16/8] overflow-hidden rounded-md">
          <ArtImage src={c.heroImage} alt={c.name} />
          <span className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <span className="absolute bottom-3 left-4 text-white">
            <span className="block text-xl font-bold">{c.name}, {c.state}</span>
            <span className="text-xs uppercase tracking-wider">{c.visitedOn ? "The collection" : "Next city"}</span>
          </span>
        </Link>
      ))}
    </div>
  );
}
