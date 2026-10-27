// A film or story (laid out like screen design pages 19–20): the film, its kind, title and
// date, what it's about, and the city and collection it belongs to. Until a film is published
// it says it premieres soon rather than linking nowhere.
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Clock, Play } from "lucide-react";
import { ArtImage } from "@/components/art-image";
import { ShareButton } from "@/components/event-client";
import { PageHeader, Skeleton, buttonClass } from "@/components/ui";
import { filmKindLabel } from "@/lib/format";
import { getFilm } from "@/lib/queries";

export default function FilmPage(props: PageProps<"/films/[slug]">) {
  return (
    <main>
      <Suspense fallback={<><PageHeader title="" back="/films" /><Skeleton className="m-5 h-96" /></>}>
        <Film params={props.params} />
      </Suspense>
    </main>
  );
}

async function Film({ params }: { params: PageProps<"/films/[slug]">["params"] }) {
  const { slug } = await params;
  const f = await getFilm(slug);
  if (!f) notFound();
  const date = f.publishedAt.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "America/New_York" });
  return (
    <>
      <PageHeader title="" back="/films" right={<ShareButton path={`/films/${f.slug}`} title={f.title} inHeader />} />
      <article>
        <div className="relative aspect-video bg-mist">
          <ArtImage src={f.poster} alt={f.title} priority />
          {f.videoUrl ? (
            <a href={f.videoUrl} target="_blank" rel="noopener" aria-label={`Watch ${f.title}`} className="absolute inset-0 flex items-center justify-center">
              <span className="flex size-20 items-center justify-center rounded-full border-4 border-white"><Play className="ml-1 size-9 fill-white text-white" /></span>
            </a>
          ) : (
            <span className="absolute inset-0 flex items-center justify-center bg-black/30 text-sm font-bold uppercase tracking-widest text-white">Premieres soon</span>
          )}
        </div>
        <div className="space-y-4 p-5">
          <span className="inline-block rounded border border-vip px-3 py-1 text-xs font-semibold uppercase tracking-widest text-vip">{filmKindLabel[f.kind]}</span>
          <h2 className="text-2xl leading-tight">{f.title}</h2>
          <p className="flex items-center gap-2 text-sm text-muted"><Clock className="size-4" /> {date}{f.minutes ? ` · ${f.minutes} min` : ""}</p>
          <p className="font-bold leading-snug">{f.summary}</p>
          <p className="leading-relaxed">{f.body}</p>
          {f.citySlug && (
            <Link href={`/cities/${f.citySlug}`} className={buttonClass("outline", "w-full")}>See the {f.cityName} collection</Link>
          )}
        </div>
      </article>
    </>
  );
}
