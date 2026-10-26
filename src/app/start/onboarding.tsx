"use client";

// Card onboarding (screen design page 2 and the development overview): pick a favorite card,
// play the game, tell us about yourself, then claim the item at the door or have it shipped.
// The game's rules (what the card number does, what the Joker's countdown leads to) are
// still open questions for the client, so this step is a stand-in that shows the flow.
import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { completeOnboarding } from "@/app/actions/account";
import { buttonClass } from "@/components/ui";

const CARDS = [
  { id: "joker", corner: "JOKER", face: "🎩" },
  { id: "queen", corner: "Q ♦", face: "♛" },
  { id: "rabbit", corner: "W", face: "🐇" },
] as const;
type CardId = (typeof CARDS)[number]["id"];

function Card({ c, selected, onSelect }: { c: (typeof CARDS)[number]; selected: boolean; onSelect: () => void }) {
  return (
    <button type="button" onClick={onSelect} aria-pressed={selected} aria-label={`${c.id} card`}
      className={`relative flex aspect-[5/7] w-full flex-col justify-between rounded-md bg-white p-2 text-ink transition-transform ${selected ? "scale-105 ring-4 ring-white" : "opacity-90"}`}>
      <span className="text-[9px] font-bold [writing-mode:vertical-rl]">{c.corner}</span>
      <span className="text-4xl" aria-hidden>{c.face}</span>
      <span className="self-end text-[9px] font-bold [writing-mode:vertical-rl] rotate-180">{c.corner}</span>
    </button>
  );
}

function Countdown({ from = 120 }: { from?: number }) {
  const [left, setLeft] = useState(from);
  useEffect(() => {
    const id = setInterval(() => setLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, []);
  return <span className="font-mono text-4xl font-bold tabular-nums">{Math.floor(left / 60)}:{String(left % 60).padStart(2, "0")}</span>;
}

export function Onboarding({ signedIn }: { signedIn: boolean }) {
  const [step, setStep] = useState(0);
  const [favorite, setFavorite] = useState<CardId | null>(null);
  const [code, setCode] = useState("");
  const [tagline, setTagline] = useState("");
  const [ship, setShip] = useState(false);
  const [state, action, pending] = useActionState(completeOnboarding, undefined);
  const steps = 4;

  if (state?.ok) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-6 px-8 text-center">
        <p className="text-2xl font-bold">{state.ok}</p>
        <p className="text-sm text-white/80">{ship ? "We'll ship your collector's item." : "Show your card at the door to claim your collector's item."}</p>
        <Link href="/" className={buttonClass("outline", "border-white text-white hover:bg-white/10")}>See the collection</Link>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-1 flex-col px-6 pb-8">
      <input type="hidden" name="favorite" value={favorite ?? ""} />
      <input type="hidden" name="fulfillment" value={ship ? "ship" : "pickup"} />
      {/* Each step's fields leave the page when the step changes, so what they hold is kept
          here and sent with the last step. */}
      <input type="hidden" name="code" value={code} />
      <input type="hidden" name="tagline" value={tagline} />

      <div className="flex flex-1 flex-col justify-center gap-8">
        {step === 0 && (
          <>
            <h1 className="text-center text-2xl font-bold uppercase">Select your favorite</h1>
            <div className="grid grid-cols-3 gap-3">
              {CARDS.map((c) => <Card key={c.id} c={c} selected={favorite === c.id} onSelect={() => setFavorite(c.id)} />)}
            </div>
            <p className="text-center text-sm font-semibold">Every card is a collector&apos;s item. Pick the one you&apos;d keep.</p>
          </>
        )}
        {step === 1 && (
          <>
            <h1 className="text-center text-2xl font-bold uppercase">We all play a game of chance</h1>
            {favorite === "joker" ? (
              <div className="flex flex-col items-center gap-3 text-center">
                <p className="text-sm">You chose the Joker. Your time starts now.</p>
                <Countdown />
              </div>
            ) : (
              <p className="text-center text-sm">Some cards in every deck are special. Enter the number on the back of yours to find out.</p>
            )}
            <label className="block">
              <span className="mb-2 block text-center text-xs uppercase tracking-widest text-white/70">Card number (optional)</span>
              <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="HOM-0001" autoCapitalize="characters"
                className="h-14 w-full rounded-md bg-white px-5 text-center font-mono text-lg tracking-widest text-ink outline-none" />
            </label>
          </>
        )}
        {step === 2 && (
          <>
            <h1 className="text-center text-2xl font-bold uppercase">Tell us about yourself</h1>
            <p className="text-center text-sm text-white/80">Other guests see this on your name tag and in the attendee list.</p>
            <input value={tagline} onChange={(e) => setTagline(e.target.value)} maxLength={80} placeholder="e.g. joyful enthusiast" aria-label="About you"
              className="h-14 w-full rounded-md bg-white px-5 text-ink outline-none" />
            {!signedIn && (
              <p className="text-center text-sm">
                You&apos;ll need an account to claim your card.{" "}
                <Link href="/signup?next=/start" className="font-bold underline">Create one</Link> or <Link href="/signin?next=/start" className="font-bold underline">sign in</Link>.
              </p>
            )}
          </>
        )}
        {step === 3 && (
          <>
            <h1 className="text-center text-2xl font-bold uppercase">Claim your item</h1>
            <div className="grid grid-cols-2 gap-3">
              {[[false, "At the door"], [true, "Ship it to me"]].map(([v, label]) => (
                <button key={String(v)} type="button" onClick={() => setShip(v as boolean)} aria-pressed={ship === v}
                  className={`h-14 rounded-full border text-sm font-bold ${ship === v ? "border-white bg-white text-ink" : "border-white/50"}`}>
                  {label as string}
                </button>
              ))}
            </div>
            {ship && <textarea name="address" rows={3} placeholder="Shipping address" className="w-full rounded-md bg-white p-4 text-sm text-ink outline-none" />}
            {state?.error && <p role="alert" className="text-center text-sm text-[#ff8a80]">{state.error}</p>}
            <button disabled={pending || !signedIn} className={buttonClass("outline", "border-white text-white hover:bg-white/10")}>
              {signedIn ? (pending ? "Saving…" : "Finish") : "Sign in to finish"}
            </button>
          </>
        )}
      </div>

      <div className="flex items-center justify-between">
        <button type="button" aria-label="Back" disabled={step === 0} onClick={() => setStep((s) => s - 1)}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-white/15 disabled:opacity-30"><ArrowLeft className="size-5" /></button>
        <span className="flex gap-2" aria-label={`Step ${step + 1} of ${steps}`}>
          {Array.from({ length: steps }, (_, i) => <span key={i} className={`size-1.5 rounded-full ${i === step ? "bg-white" : "bg-white/40"}`} />)}
        </span>
        <button type="button" aria-label="Next" disabled={step === steps - 1 || (step === 0 && !favorite)} onClick={() => setStep((s) => s + 1)}
          className="flex h-12 w-20 items-center justify-center rounded-full bg-white/70 text-ink disabled:opacity-30"><ArrowRight className="size-5" /></button>
      </div>
    </form>
  );
}
