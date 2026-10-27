// Films and stories (business plan, "Website Blueprint"): music videos, city films, mission
// stories and behind the scenes, newest first, filtered by kind.
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Play } from "lucide-react";
import { ArtImage } from "@/components/art-image";
import { Empty, PageHeader, Skeleton } from "@/components/ui";
import { filmKindLabel } from "@/lib/format";
import { listFilms } from "@/lib/queries";

export const metadata: Metadata = { title: "Films" };

const KINDS = [["", "All"], ["music_video", "Music videos"], ["city_film", "City films"], ["mission_story", "Mission stories"], ["behind_the_scenes", "Behind the scenes"]] as const;

export default function FilmsPage(props: PageProps<"/films">) {
  return (
    <main>
      <PageHeader title="Films" back="/" />
      <Suspense fallback={<Skeleton className="m-5 h-96" />}><Films searchParams={props.searchParams} /></Suspense>
    </main>
  );
}

async function Films({ searchParams }: { searchParams: PageProps<"/films">["searchParams"] }) {
  const sp = await searchParams;
  const kind = KINDS.some(([k]) => k && k === sp.kind) ? (sp.kind as string) : "";
  const films = await listFilms(kind || undefined);
  return (
    <div className="space-y-5 p-5">
      <nav aria-label="Kinds of film" className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none]">
        {KINDS.map(([k, label]) => (
          <Link key={k} href={k ? `/films?kind=${k}` : "/films"} aria-current={kind === k ? "page" : undefined}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold ${kind === k ? "border-ink bg-ink text-white" : "border-line"}`}>{label}</Link>
        ))}
      </nav>
      {films.length ? (
        <ul className="space-y-6">
          {films.map((f) => (
            <li key={f.slug}>
              <Link href={`/films/${f.slug}`} className="block">
                <span className="relative block aspect-video overflow-hidden rounded-md bg-mist">
                  <ArtImage src={f.poster} alt={f.title} sizes="(max-width: 768px) 100vw, 672px" />
                  <span className="absolute bottom-2 left-2 flex items-center gap-2 rounded bg-black/70 px-2 py-1 text-xs text-white">
                    {f.videoUrl ? <><Play className="size-3 fill-white" /> {f.minutes ? `${f.minutes} min` : "Watch"}</> : "Premieres soon"}
                  </span>
                </span>
                <span className="mt-3 inline-block rounded border border-vip px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-vip">{filmKindLabel[f.kind]}</span>
                <span className="mt-1 block text-lg font-semibold leading-snug">{f.title}</span>
                <span className="block text-sm text-muted">{f.summary}</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : <Empty>No films of this kind yet.</Empty>}
    </div>
  );
}
