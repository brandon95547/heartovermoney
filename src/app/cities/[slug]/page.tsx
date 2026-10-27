// A city's permanent story page: where its collection came from. Certificates' QR codes
// lead here.
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Music, Play } from "lucide-react";
import { ArtImage } from "@/components/art-image";
import { ArtworkCard } from "@/components/cards";
import { Empty, PageHeader, SectionLabel, Skeleton } from "@/components/ui";
import { filmForCity, getCity, listArtworks } from "@/lib/queries";

export default function CityPage(props: PageProps<"/cities/[slug]">) {
  return (
    <main>
      <PageHeader title="City" back="/" />
      <Suspense fallback={<Skeleton className="m-5 h-96" />}><City params={props.params} /></Suspense>
    </main>
  );
}

async function City({ params }: { params: PageProps<"/cities/[slug]">["params"] }) {
  const { slug } = await params;
  const city = await getCity(slug);
  if (!city) notFound();
  const [works, film] = await Promise.all([listArtworks({ citySlug: slug }), filmForCity(slug)]);
  return (
    <article>
      <div className="relative aspect-[16/10] bg-mist">
        <ArtImage src={city.heroImage} alt={city.name} priority />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
        <div className="absolute bottom-4 left-5 text-white">
          <p className="text-xs uppercase tracking-[0.2em]">{city.visitedOn ? "The collection" : "Next city"}</p>
          <h2 className="text-3xl font-bold">{city.name}, {city.state}</h2>
        </div>
      </div>
      <div className="space-y-6 p-5">
        <p className="leading-relaxed">{city.story}</p>
        {city.songTitle && (
          <p className="flex items-center gap-3 rounded-md bg-fog p-4 text-sm"><Music className="size-5" strokeWidth={1.5} /> Song: <b>{city.songTitle}</b></p>
        )}
        {film && (
          <Link href={`/films/${film.slug}`} className="flex items-center gap-3 rounded-md border border-line p-4 text-sm">
            <Play className="size-5" strokeWidth={1.5} /> Watch <b>{film.title}</b>
          </Link>
        )}
        <section>
          <SectionLabel className="mb-3">The {city.name} collection</SectionLabel>
          {works.length ? (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3">{works.map((a) => <ArtworkCard key={a.slug} a={a} wide />)}</div>
          ) : <Empty>The {city.name} collection will be revealed after the trip.</Empty>}
        </section>
      </div>
    </article>
  );
}
