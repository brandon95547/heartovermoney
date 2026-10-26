import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ArtImage } from "@/components/art-image";
import { CheckoutForm } from "@/components/shop-forms";
import { Empty, PageHeader, Skeleton, buttonClass } from "@/components/ui";
import { setCartQuantity } from "@/app/actions/shop";
import { requireUser } from "@/lib/dal";
import { money } from "@/lib/format";
import { getCart } from "@/lib/queries";

export const metadata: Metadata = { title: "Cart" };

export default function CartPage() {
  return (
    <main>
      <PageHeader title="Cart" back="/" />
      <Suspense fallback={<Skeleton className="m-5 h-64" />}><Cart /></Suspense>
    </main>
  );
}

async function Cart() {
  const user = await requireUser("/cart");
  const items = await getCart(user.id);
  if (!items.length) {
    return (
      <div className="space-y-4 p-5">
        <Empty>Your cart is empty.</Empty>
        <Link href="/" className={buttonClass("primary", "w-full")}>See the collections</Link>
      </div>
    );
  }
  const total = items.reduce((t, i) => t + i.priceCents * i.quantity, 0);
  return (
    <div className="space-y-6 p-5">
      <ul className="divide-y divide-line">
        {items.map((i) => (
          <li key={i.artworkId} className="flex gap-4 py-4">
            <Link href={`/art/${i.slug}`} className="relative size-20 shrink-0 overflow-hidden rounded-sm bg-mist">
              <ArtImage src={i.images[0]} alt={i.title} sizes="80px" />
            </Link>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{i.title}</p>
              <p className="text-xs text-muted">by {i.artistName} · {Math.max(0, i.editionSize - i.sold)} left</p>
              <p className="mt-1 text-sm font-semibold">{money(i.priceCents * i.quantity)}</p>
            </div>
            <form action={setCartQuantity} className="flex items-center gap-2 self-center">
              <input type="hidden" name="artworkId" value={i.artworkId} />
              <button name="quantity" value={i.quantity - 1} aria-label="One fewer" className="size-8 rounded-full bg-fog text-lg">−</button>
              <span className="w-5 text-center text-sm font-semibold" aria-label="Quantity">{i.quantity}</span>
              <button name="quantity" value={i.quantity + 1} aria-label="One more" className="size-8 rounded-full bg-fog text-lg">+</button>
            </form>
          </li>
        ))}
      </ul>
      <div className="flex justify-between border-t border-line pt-4 text-lg font-bold">
        <span>Total</span><span>{money(total, { cents: true })}</span>
      </div>
      <CheckoutForm totalLabel={money(total)} />
    </div>
  );
}
