// An event's photo wall (screen design pages 6–9): the photos posted to the event, one per
// screen, swiped vertically, with the poster's hashtags across the top, likes and thumbs-downs,
// sharing and downloading, and the caption. Refreshes on its own so new photos appear during the
// event. Admins can remove one.
import Link from "next/link";
import { Camera, ChevronLeft, Download } from "lucide-react";
import { ArtImage } from "@/components/art-image";
import { AutoRefresh, DownvoteButton, LikeButton, RemovePhotoButton, ShareButton } from "@/components/event-client";
import { Logo } from "@/components/logo";
import { eventHashtag } from "@/lib/hashtags";
import type { listPhotos } from "@/lib/queries";

type Photo = Awaited<ReturnType<typeof listPhotos>>[number];

export function PhotoWall({ photos, viewer, back, postHref }: {
  photos: Photo[];
  viewer: { id: string; isAdmin: boolean } | null;
  back: { href: string; label: string };
  postHref?: string;
}) {
  return (
    <>
      <AutoRefresh seconds={8} />
      <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between p-4">
        <Link href={back.href} aria-label={back.label} className="rounded-full bg-black/40 p-2"><ChevronLeft className="size-5" /></Link>
        {postHref && <Link href={postHref} className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-bold text-ink"><Camera className="size-4" /> Post a photo</Link>}
      </div>
      <div className="snap-wall h-full overflow-y-auto pb-16">
        {photos.map((p, i) => (
          <section key={p.id} id={p.id} className="relative h-full w-full">
            <ArtImage src={p.image} alt={p.caption || `Photo by @${p.username}`} sizes="(max-width: 768px) 100vw, 672px" priority={i === 0} />
            <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60" />
            <div className="absolute left-4 right-4 top-16 flex items-center gap-3">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-full border border-white/70 bg-black"><Logo size={26} reversed /></span>
              <p className="text-lg leading-tight">{[...new Set([...p.hashtags, eventHashtag(p.cityName, p.eventStartsAt)])].map((h) => `#${h}`).join(" ")}</p>
            </div>
            <div className="absolute left-4 top-36 flex flex-col items-center gap-6">
              <LikeButton photoId={p.id} slug={p.eventSlug} liked={p.liked} count={p.likes} />
              {viewer?.id !== p.userId && <DownvoteButton photoId={p.id} slug={p.eventSlug} downvoted={p.downvoted} />}
              <ShareButton path={`/events/${p.eventSlug}/photos#${p.id}`} title={`@${p.username} at ${p.eventTitle}`} />
              {/* Every photo on the wall can be downloaded (development overview page 4). */}
              <a href={p.image} download aria-label="Download photo" className="drop-shadow"><Download className="size-6" strokeWidth={1.5} /></a>
              {viewer?.isAdmin && <RemovePhotoButton photoId={p.id} slug={p.eventSlug} />}
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
