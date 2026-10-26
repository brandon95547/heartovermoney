// Art detail (screen design pages 25–26): photos, stock, price, artist, Add to cart, and what
// makes it collectible — its edition, certificate and city.
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Gallery } from "@/components/gallery";
import { AddToCart } from "@/components/shop-forms";
import { PageHeader, Skeleton } from "@/components/ui";
import { kindLabel, money } from "@/lib/format";
import { getArtwork } from "@/lib/queries";

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
  const a = await getArtwork(slug);
  if (!a) notFound();
  const left = a.editionSize - a.sold;
  const soldOut = left <= 0;

  return (
    <article>
      <Gallery images={a.images} alt={a.title} />
      <div className="space-y-5 px-5 py-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider">{soldOut ? "Sold out" : "In stock"}</p>
          <p className="mt-1 text-3xl font-semibold">{money(a.priceCents, { cents: true })}</p>
          <h2 className="mt-2 text-lg font-semibold leading-snug">{a.title}</h2>
          <p className="text-sm">by <span className="font-bold">{a.artistName}</span></p>
        </div>
        <AddToCart slug={a.slug} soldOut={soldOut} />
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
        <p className="border-t border-line pt-4 text-xs leading-relaxed text-muted">
          Located in: {a.cityName}, {a.cityState}, United States. Claim it at the event, or have it shipped.
        </p>
      </div>
    </article>
  );
}
