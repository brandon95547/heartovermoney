// Art detail (screen design pages 25–26): photos, stock, price, artist, Add to cart, and what
// makes it collectible — its edition, certificate, city and film. Anyone can look; only VIPs
// can buy art (a guest is sent to sign in, a member to Membership, and both come back here).
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Gallery } from "@/components/gallery";
import { AddToCart } from "@/components/shop-forms";
import { PageHeader, Skeleton } from "@/components/ui";
import { getUser } from "@/lib/dal";
import { kindLabel, money } from "@/lib/format";
import { needsVip } from "@/lib/membership";
import { filmForCity, getArtwork } from "@/lib/queries";

export default function ArtPage(props: PageProps<"/art/[slug]">) {
  return (
    <main>
      <PageHeader title="Art" back="/" />
      <Suspense fallback={<Skeleton className="m-5 h-96" />}>
        <ArtDetail params={props.params} />
      </Suspense>
    </main>
  );
}

async function ArtDetail({ params }: { params: PageProps<"/art/[slug]">["params"] }) {
  const { slug } = await params;
  const [a, user] = await Promise.all([getArtwork(slug), getUser()]);
  if (!a) notFound();
  const film = await filmForCity(a.citySlug);
  // Art is VIP-only; anything not yet released is too, until its release (VIPs' early access).
  // Anyone can still add it to the cart; the note says a membership is needed at checkout.
  const unreleased = !!a.releasesAt && a.releasesAt > new Date();
  const vipNote = user?.isVip ? undefined
    : needsVip(a.kind) ? "Art is for VIP members, from $25 a month: you'll need a membership at checkout."
    : unreleased ? "Until its release, only VIP members can buy this drop." : undefined;
  const left = a.editionSize - a.sold;
  const soldOut = left <= 0;

  return (
    <article>
      <Gallery images={a.images} alt={a.title} />
      <div className="space-y-5 px-5 py-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider">{soldOut ? "Sold out" : unreleased ? "Coming soon" : "In stock"}</p>
          {unreleased && !soldOut && (
            <p className="mt-1 inline-block rounded bg-vip/10 px-2 py-0.5 text-xs font-semibold text-vip">
              Releases {a.releasesAt!.toLocaleString("en-US", { month: "long", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/New_York" })} · VIP members can buy it now
            </p>
          )}
          <p className="mt-1 text-3xl font-semibold">{money(a.priceCents, { cents: true })}</p>
          <h2 className="mt-2 text-lg font-semibold leading-snug">{a.title}</h2>
          <p className="text-sm">by <Link href={`/artists/${a.artistSlug}`} className="font-bold underline-offset-2 hover:underline">{a.artistName}</Link></p>
        </div>
        <AddToCart slug={a.slug} soldOut={soldOut} vipNote={vipNote} />
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
          <div><dt className="text-xs text-muted">Edition</dt><dd className="font-semibold">{a.editionSize} pieces</dd></div>
          <div><dt className="text-xs text-muted">Available</dt><dd className="font-semibold">{soldOut ? "None, never reprinted" : `${left} of ${a.editionSize}`}</dd></div>
          <div><dt className="text-xs text-muted">Collection</dt><dd><Link href={`/cities/${a.citySlug}`} className="font-semibold underline">{a.cityName}, {a.cityState}</Link></dd></div>
          <div><dt className="text-xs text-muted">Type</dt><dd className="font-semibold">{kindLabel[a.kind]}</dd></div>
        </dl>
        <p className="text-sm leading-relaxed">{a.description}</p>
        <div className="rounded-md bg-fog p-4 text-sm leading-relaxed">
          <p className="font-semibold">Certificate of authenticity</p>
          <p className="text-muted">Numbered, with the title, edition number, city, date, artist, the collection&apos;s story and song, and a QR code to the {a.cityName} story.</p>
        </div>
        {film && (
          <Link href={`/films/${film.slug}`} className="flex items-center justify-between rounded-md border border-line p-4 text-sm">
            <span><span className="block text-xs text-muted">The {a.cityName} {film.kind === "music_video" ? "music video" : "film"}</span><b>{film.title}</b></span>
            <span className="font-semibold underline">Watch</span>
          </Link>
        )}
        <div className="space-y-1 border-t border-line pt-4 text-xs leading-relaxed text-muted">
          <p>Located in: {a.cityName}, {a.cityState}, United States</p>
          <p>Pickup: claim it at the door of the next event, at no cost.</p>
          <p>Shipping: or have it shipped; you give the address at checkout.</p>
        </div>
      </div>
    </article>
  );
}
