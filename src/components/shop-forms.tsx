"use client";

// Forms that buy: Add to cart, Buy Now, Place bid and checkout. Each shows the action's
// message (an error, or a confirmation) under its button.
import Link from "next/link";
import { useActionState, useState } from "react";
import { addToCart, buyNow, checkout, placeBid, type ActionState } from "@/app/actions/shop";
import { buttonClass } from "@/components/ui";

function Message({ state }: { state: ActionState }) {
  if (state?.error) return <p role="alert" className="mt-2 text-sm text-alert">{state.error}</p>;
  if (state?.ok) return <p role="status" className="mt-2 text-sm text-go">{state.ok}</p>;
  return null;
}

// `vipOnly`: the piece is art and the visitor isn't a VIP, so it points to Membership instead.
export function AddToCart({ slug, soldOut, vipOnly = false }: { slug: string; soldOut: boolean; vipOnly?: boolean }) {
  const [state, action, pending] = useActionState(addToCart, undefined);
  if (vipOnly && !soldOut) {
    return (
      <div>
        <Link href="/membership" className={buttonClass("primary", "w-52")}>VIP members only</Link>
        <p className="mt-2 text-sm text-muted">Art is for VIP members. Membership starts at $25 a month.</p>
      </div>
    );
  }
  return (
    <form action={action}>
      <input type="hidden" name="slug" value={slug} />
      <button disabled={soldOut || pending} className={buttonClass("primary", "w-44")}>
        {soldOut ? "Sold out" : pending ? "Adding…" : "Add to cart"}
      </button>
      <Message state={state} />
    </form>
  );
}

export function LotActions({ lotId, canBuyNow, canBid, minBidDollars, buyNowLabel }: {
  lotId: string; canBuyNow: boolean; canBid: boolean; minBidDollars: number; buyNowLabel: string;
}) {
  const [buyState, buyAction, buying] = useActionState(buyNow, undefined);
  const [bidState, bidAction, bidding] = useActionState(placeBid, undefined);
  const [bidOpen, setBidOpen] = useState(false);
  return (
    <div>
      <div className="grid grid-cols-2 gap-3">
        <form action={buyAction}>
          <input type="hidden" name="lotId" value={lotId} />
          <button disabled={!canBuyNow || buying} className={buttonClass("primary", "w-full")}>
            {buying ? "Buying…" : buyNowLabel}
          </button>
        </form>
        <button type="button" disabled={!canBid} onClick={() => setBidOpen((o) => !o)} className={buttonClass("primary", "w-full")}>
          Place bid
        </button>
      </div>
      <Message state={buyState} />
      {bidOpen && canBid && (
        <form action={bidAction} className="mt-4 flex items-center gap-3">
          <input type="hidden" name="lotId" value={lotId} />
          <label className="flex h-12 flex-1 items-center rounded-full bg-fog px-5">
            <span className="mr-1 font-semibold">$</span>
            <span className="sr-only">Your bid in dollars</span>
            <input name="amount" type="number" inputMode="numeric" min={minBidDollars} step="25" defaultValue={minBidDollars} required
              className="w-full bg-transparent text-sm font-semibold outline-none" />
          </label>
          <button disabled={bidding} className={buttonClass("black")}>{bidding ? "Bidding…" : "Bid"}</button>
        </form>
      )}
      <Message state={bidState} />
    </div>
  );
}

export function CheckoutForm({ totalLabel }: { totalLabel: string }) {
  const [state, action, pending] = useActionState(checkout, undefined);
  const [ship, setShip] = useState(false);
  return (
    <form action={action} className="space-y-4">
      <fieldset className="grid grid-cols-2 gap-3">
        <legend className="sr-only">How you&apos;ll receive it</legend>
        {[["pickup", "Claim at the event"], ["ship", "Ship to me"]].map(([v, label]) => (
          <label key={v} className={`flex h-12 cursor-pointer items-center justify-center rounded-full border text-sm font-semibold ${(v === "ship") === ship ? "border-ink bg-ink text-white" : "border-line"}`}>
            <input type="radio" name="fulfillment" value={v} checked={(v === "ship") === ship} onChange={() => setShip(v === "ship")} className="sr-only" />
            {label}
          </label>
        ))}
      </fieldset>
      {ship && (
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted">Shipping address</span>
          <textarea name="address" rows={3} required className="w-full rounded-md bg-fog p-4 text-sm outline-none focus:ring-2 focus:ring-ink/20" />
        </label>
      )}
      <Message state={state} />
      <button disabled={pending} className={buttonClass("black", "w-full")}>
        {pending ? "Placing order…" : `Place order · ${totalLabel}`}
      </button>
      <p className="text-center text-xs text-muted">Test mode: no card is charged.</p>
    </form>
  );
}
