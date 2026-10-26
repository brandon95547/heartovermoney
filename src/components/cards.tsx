// Cards for the carousels and grids: an artwork, an auction lot, a city.
import Link from "next/link";
import { ArtImage } from "@/components/art-image";
import { money, timeLeft } from "@/lib/format";

type Artwork = {
  slug: string; title: string; images: string[]; priceCents: number; artistName: string;
  editionSize: number; sold: number;
};

export function ArtworkCard({ a, wide = false }: { a: Artwork; wide?: boolean }) {
  const soldOut = a.sold >= a.editionSize;
  return (
    <Link href={`/art/${a.slug}`} className={`group block ${wide ? "" : "w-40 shrink-0 snap-start"}`}>
      <div className="relative aspect-square overflow-hidden rounded-sm bg-mist">
        <ArtImage src={a.images[0]} alt={a.title} sizes="160px" className="transition-transform group-hover:scale-105" />
        {soldOut && <span className="absolute left-2 top-2 rounded bg-ink px-2 py-0.5 text-[10px] font-bold uppercase text-white">Sold out</span>}
      </div>
      <p className="mt-2 truncate text-sm">{a.artistName}</p>
      <p className="truncate text-xs text-muted">{a.title}</p>
      <p className="text-sm font-semibold">{money(a.priceCents)}</p>
    </Link>
  );
}

type Lot = {
  id: string; title: string; maker: string; images: string[]; buyNowCents: number | null;
  startingBidCents: number; topBidCents: number | null; auctionEndsAt: Date; status: string;
};

export function LotCard({ l, now }: { l: Lot; now: Date }) {
  const current = l.topBidCents ?? l.startingBidCents;
  return (
    <Link href={`/auction/${l.id}`} className="group block w-40 shrink-0 snap-start">
      <div className="relative aspect-square overflow-hidden rounded-sm bg-mist">
        <ArtImage src={l.images[0]} alt={l.title} sizes="160px" className="transition-transform group-hover:scale-105" />
        <span className="absolute bottom-2 left-2 rounded bg-paper/90 px-2 py-0.5 text-[10px] font-semibold text-alert">
          {l.status === "open" ? `${timeLeft(l.auctionEndsAt, now)} left` : "Sold"}
        </span>
      </div>
      <p className="mt-2 truncate text-sm">{l.maker}</p>
      <p className="truncate text-xs text-muted">{l.title}</p>
      <p className="text-sm font-semibold">{money(current)}</p>
    </Link>
  );
}

export function Carousel({ children }: { children: React.ReactNode }) {
  return <div className="-mx-5 flex snap-x scroll-px-5 gap-4 overflow-x-auto px-5 pb-2 [scrollbar-width:none]">{children}</div>;
}
