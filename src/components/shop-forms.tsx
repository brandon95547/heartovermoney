"use client";

// Forms that buy: Add to cart, Buy Now, Place bid and checkout. Each shows the action's
// message (an error, or a confirmation) under its button.
import Link from "next/link";
import { useActionState, useState } from "react";
import { addToCart, buyNow, checkout, placeBid, type ActionState } from "@/app/actions/shop";
import { buttonClass } from "@/components/ui";
import { withNext } from "@/lib/next-path";

function Message({ state }: { state: ActionState }) {
  if (state?.error) return <p role="alert" className="mt-2 text-sm text-alert">{state.error}</p>;
  if (state?.ok) return <p role="status" className="mt-2 text-sm text-go">{state.ok}</p>;
  return null;
}

// `gate`: the piece is art, which only VIPs can buy. A visitor who isn't signed in is sent to
// sign in first, and a member who isn't a VIP to Membership; either way they come back here.
export function AddToCart({ slug, soldOut, gate, early = false }: { slug: string; soldOut: boolean; gate?: "signin" | "vip"; early?: boolean }) {
  const [state, action, pending] = useActionState(addToCart, undefined);
  if (gate && !soldOut) {
    const back = `/art/${slug}`;
    return (
      <div>
        {gate === "signin"
          ? <Link href={withNext("/signin", back)} className={buttonClass("primary", "w-52")}>Sign in to buy</Link>
          : <Link href={withNext("/membership", back)} className={buttonClass("primary", "w-52")}>Become a VIP to buy</Link>}
        <p className="mt-2 text-sm text-muted">
          {early ? "VIP members can buy this drop before its release." : "Art is for VIP members."}{" "}
          {gate === "signin" ? "Sign in, or create an account, then choose a membership from $25 a month." : "Membership starts at $25 a month, and brings you back here."}
        </p>
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

export function CheckoutForm({ totalLabel, defaultAddress }: { totalLabel: string; defaultAddress: string }) {
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
          <textarea name="address" rows={3} required defaultValue={defaultAddress} className="w-full rounded-md bg-fog p-4 text-sm outline-none focus:ring-2 focus:ring-ink/20" />
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
