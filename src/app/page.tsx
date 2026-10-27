// Products home (screen design page 24): new works by the artists you follow, auction lots
// ending soon, and each city's collection. ☰ opens the site menu.
import Link from "next/link";
import { Suspense } from "react";
import { Logo } from "@/components/logo";
import { ArtworkCard, Carousel, LotCard } from "@/components/cards";
import { ArtImage } from "@/components/art-image";
import { SiteMenu, SiteMenuFallback } from "@/components/site-menu";
import { Skeleton, SectionLabel } from "@/components/ui";
import { getUser } from "@/lib/dal";
import { listArtworks, listCities, listOpenLots } from "@/lib/queries";

export default function HomePage() {
  return (
    <main className="px-5 pb-8">
      <div className="grid grid-cols-[2.5rem_1fr_2.5rem] items-center py-6">
        <Suspense fallback={<SiteMenuFallback />}><SiteMenu /></Suspense>
        <Link href="/" aria-label="Heart Over Money home" className="justify-self-center"><Logo size={66} /></Link>
      </div>
      <Suspense fallback={<RowSkeleton title="New Works" />}><NewWorks /></Suspense>
      <Suspense fallback={<RowSkeleton title="Auction Lots Ending Soon" />}><EndingLots /></Suspense>
      <Suspense fallback={<RowSkeleton title="Collections" />}><Collections /></Suspense>
    </main>
  );
}

function RowSkeleton({ title }: { title: string }) {
  return (
    <section className="mt-6">
      <h2 className="mb-3 text-lg">{title}</h2>
      <div className="flex gap-4"><Skeleton className="h-52 w-40" /><Skeleton className="h-52 w-40" /></div>
    </section>
  );
}

async function NewWorks() {
  const user = await getUser();
  const followed = user ? await listArtworks({ followedBy: user.id, limit: 12 }) : [];
  const works = followed.length ? followed : await listArtworks({ limit: 12 });
  return (
    <section className="mt-2">
      <h2 className="mb-3 text-lg">{followed.length ? "New Works by Artists You Follow" : "New Works"}</h2>
      <Carousel>{works.map((a) => <ArtworkCard key={a.slug} a={a} />)}</Carousel>
    </section>
  );
}

async function EndingLots() {
  const lots = await listOpenLots();
  const now = new Date();
  if (!lots.length) return null;
  return (
    <section className="mt-8">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-lg">Auction Lots Ending Soon</h2>
        <Link href="/auctions" className="text-xs font-semibold underline">See all</Link>
      </div>
      <Carousel>{lots.map((l) => <LotCard key={l.id} l={l} now={now} />)}</Carousel>
    </section>
  );
}

async function Collections() {
  const cities = await listCities();
  return (
    <section className="mt-8">
      <div className="mb-3 flex items-baseline justify-between">
        <SectionLabel>Collections</SectionLabel>
        <Link href="/cities" className="text-xs font-semibold underline">All cities</Link>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {cities.map((c) => (
          <Link key={c.slug} href={`/cities/${c.slug}`} className="relative block aspect-[16/7] overflow-hidden rounded-md">
            <ArtImage src={c.heroImage} alt={c.name} />
            <span className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <span className="absolute bottom-3 left-4 text-white">
              <span className="block text-lg font-bold">{c.name}, {c.state}</span>
              <span className="text-xs uppercase tracking-wider">{c.visitedOn ? "Collection" : "Next city"}</span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
