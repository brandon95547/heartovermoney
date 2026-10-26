// The photo wall (screen design pages 6–9): one photo per screen, swiped vertically, with
// likes and the poster's caption. Refreshes on its own so new photos appear during the event.
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Camera, ChevronLeft, Share2 } from "lucide-react";
import { ArtImage } from "@/components/art-image";
import { AutoRefresh, LikeButton } from "@/components/event-client";
import { Logo } from "@/components/logo";
import { getUser } from "@/lib/dal";
import { getEvent, listPhotos } from "@/lib/queries";

export default function PhotoWallPage(props: PageProps<"/events/[slug]/photos">) {
  return (
    <main className="fixed inset-0 z-30 mx-auto max-w-md bg-black text-white md:max-w-2xl">
      <Suspense fallback={<div className="flex h-full items-center justify-center text-sm">Loading photos…</div>}>
        <Wall params={props.params} />
      </Suspense>
    </main>
  );
}

async function Wall({ params }: { params: PageProps<"/events/[slug]/photos">["params"] }) {
  const { slug } = await params;
  const found = await getEvent(slug);
  if (!found) notFound();
  const user = await getUser();
  const photos = await listPhotos(found.event.id, user?.id);
  const tags = `#heartovermoney #art #${found.cityName.toLowerCase()}${found.event.startsAt.getFullYear()}`;

  return (
    <>
      <AutoRefresh seconds={8} />
      <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between p-4">
        <Link href={`/events/${slug}`} aria-label="Back to the event" className="rounded-full bg-black/40 p-2"><ChevronLeft className="size-5" /></Link>
        <Link href={`/events/${slug}/photos/new`} className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-bold text-ink"><Camera className="size-4" /> Post a photo</Link>
      </div>
      <div className="snap-wall h-full overflow-y-auto pb-16">
        {photos.map((p, i) => (
          <section key={p.id} id={p.id} className="relative h-full w-full">
            <ArtImage src={p.image} alt={p.caption || `Photo by @${p.username}`} sizes="(max-width: 768px) 100vw, 672px" priority={i === 0} />
            <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60" />
            <div className="absolute left-4 right-4 top-16 flex items-center gap-3">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-full border border-white/70 bg-black"><Logo size={26} reversed /></span>
              <p className="text-lg leading-tight">{tags}</p>
            </div>
            <div className="absolute left-4 top-36 flex flex-col items-center gap-6">
              <LikeButton photoId={p.id} slug={slug} liked={p.liked} count={p.likes} />
              <a href={p.image} download aria-label="Download photo" className="drop-shadow"><Share2 className="size-7" strokeWidth={1.5} /></a>
            </div>
            <div className="absolute inset-x-0 bottom-20 px-5">
              <p className="text-lg font-bold">@{p.username}</p>
              {p.caption && <p className="text-lg leading-snug">{p.caption}</p>}
            </div>
          </section>
        ))}
        {!photos.length && <p className="flex h-full items-center justify-center p-8 text-center">No photos yet. Be the first to post one.</p>}
      </div>
    </>
  );
}
