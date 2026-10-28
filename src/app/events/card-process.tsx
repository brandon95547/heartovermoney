"use client";

// The card process for the next event (development overview page 2, and the client's answers
// of October 2026). Pick the collector card you'll get at the door, from the designs with
// cards left. Draw the Joker and you have two minutes to choose between a guaranteed $20 gift
// card and keeping it, not knowing that keeping it means VIP access at the event. Then a line
// about yourself (with the VIP upgrade for anyone who isn't one), and the door or the mail.
// The Joker's clock and choice are kept on the server, so reloading can't restart it.
import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { chooseJoker, registerForEvent, startJokerTimer, type RegistrationState } from "@/app/actions/events";
import { buttonClass } from "@/components/ui";
import { CARD_DESIGNS, type CardDesign } from "@/lib/cards";

type Step = "favorite" | "joker" | "about" | "claim";
type JokerChoice = "kept" | "gift_card";

function Card({ design, selected, onSelect }: { design: CardDesign; selected: boolean; onSelect: () => void }) {
  const c = CARD_DESIGNS[design];
  return (
    <button type="button" onClick={onSelect} aria-pressed={selected} aria-label={`${c.name} card`}
      className={`relative flex aspect-[5/7] w-full flex-col justify-between rounded-md bg-white p-2 text-ink transition-transform ${selected ? "scale-105 ring-4 ring-white" : "opacity-90"}`}>
      <span className="text-[9px] font-bold [writing-mode:vertical-rl]">{c.corner}</span>
      <span className="text-4xl" aria-hidden>{c.face}</span>
      <span className="self-end text-[9px] font-bold [writing-mode:vertical-rl] rotate-180">{c.corner}</span>
    </button>
  );
}

// Counts down to the server's deadline (already shifted onto this phone's clock).
function Countdown({ deadline, onExpire }: { deadline: number; onExpire: () => void }) {
  const [left, setLeft] = useState(() => Math.max(0, Math.ceil((deadline - Date.now()) / 1000)));
  useEffect(() => {
    const id = setInterval(() => {
      const s = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setLeft(s);
      if (s === 0) { clearInterval(id); onExpire(); }
    }, 250);
    return () => clearInterval(id);
  }, [deadline, onExpire]);
  return <span className="font-mono text-5xl font-bold tabular-nums">{Math.floor(left / 60)}:{String(left % 60).padStart(2, "0")}</span>;
}

export function CardProcess({ event, options, tagline: savedTagline, shipAddress, vipMember, forChat = false }: {
  event: { id: string; slug: string; title: string; place: string; when: string; terms: string };
  options: CardDesign[];
  tagline: string;
  shipAddress: string;
  vipMember: boolean;
  // Sent here by the Chat icon: say why registering comes first.
  forChat?: boolean;
}) {
  const [favorite, setFavorite] = useState<CardDesign | null>(null);
  const [jokerChoice, setJokerChoice] = useState<JokerChoice | null>(null);
  const [jokerLate, setJokerLate] = useState(false);
  const [jokerDeadline, setJokerDeadline] = useState<number | null>(null);
  const [tagline, setTagline] = useState(savedTagline);
  const [ship, setShip] = useState(false);
  const [index, setIndex] = useState(0);
  const [state, action, pending] = useActionState<RegistrationState, FormData>(registerForEvent, undefined);

  const steps: Step[] = favorite === "joker" ? ["favorite", "joker", "about", "claim"] : ["favorite", "about", "claim"];
  const step = steps[index];
  const canGoOn = step === "favorite" ? !!favorite : step === "joker" ? !!jokerChoice : step === "about";

  const pick = (d: CardDesign) => { setFavorite(d); if (d !== "joker") setJokerChoice(null); };
  const next = async () => {
    if (steps[index + 1] === "joker" && jokerDeadline === null) {
      const timer = await startJokerTimer(event.id);
      // The server's deadline, moved onto this phone's clock.
      setJokerDeadline(timer ? Date.now() + (timer.deadline - timer.now) : Date.now());
      if (timer?.choice) setJokerChoice(timer.choice);
    }
    setIndex((i) => i + 1);
  };
  const choose = async (c: JokerChoice) => {
    const result = await chooseJoker(event.id, c);
    setJokerChoice(result.choice);
    setJokerLate(result.late);
  };

  if (state?.done) return <Done {...state.done} event={event} vipMember={vipMember} />;

  if (!options.length) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-6 px-8 text-center">
        <p className="text-2xl font-bold">Every card has been claimed</p>
        <p className="text-sm text-white/80">All the collector cards for {event.title} in {event.place} are spoken for.</p>
        <Link href="/" className={buttonClass("outline", "border-white text-white hover:bg-white/10")}>See the collection</Link>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-1 flex-col px-6 pb-8">
      <input type="hidden" name="eventId" value={event.id} />
      <input type="hidden" name="favorite" value={favorite ?? ""} />
      <input type="hidden" name="tagline" value={tagline} />
      <input type="hidden" name="fulfillment" value={ship ? "ship" : "pickup"} />
      {forChat && <p className="text-center text-sm font-semibold">Register for the event with your collector card to open the Connections Messenger.</p>}

      <div className="flex flex-1 flex-col justify-center gap-8">
        {step === "favorite" && (
          <>
            <div className="text-center">
              <p className="text-xs uppercase tracking-widest text-white/70">Welcome to {event.title} · {event.place}</p>
              <p className="text-xs text-white/70">{event.when}</p>
            </div>
            <h1 className="text-center text-2xl font-bold uppercase">Select your favorite</h1>
            <div className={`grid gap-3 ${options.length === 3 ? "grid-cols-3" : options.length === 2 ? "mx-auto w-2/3 grid-cols-2" : "mx-auto w-1/3 grid-cols-1"}`}>
              {options.map((d) => <Card key={d} design={d} selected={favorite === d} onSelect={() => pick(d)} />)}
            </div>
            <p className="text-center text-sm font-semibold">This is the card you&apos;ll get at the door. Every card is a collector&apos;s item.</p>
          </>
        )}
        {step === "joker" && (
          <>
            <h1 className="text-center text-2xl font-bold uppercase">We all play a game of chance</h1>
            {jokerChoice ? (
              <p className="text-center text-lg font-semibold">
                {jokerLate ? "Time ran out, so you're keeping the Joker." : jokerChoice === "kept" ? "You're keeping the Joker." : "You're taking the $20 gift card."}
              </p>
            ) : (
              <div className="flex flex-col items-center gap-4 text-center">
                <p className="text-sm">You drew the Joker. Decide before the clock runs out.</p>
                {jokerDeadline !== null && <Countdown deadline={jokerDeadline} onExpire={() => { setJokerChoice((c) => c ?? "kept"); setJokerLate(true); }} />}
                <button type="button" onClick={() => choose("gift_card")} className={buttonClass("outline", "w-full border-white text-white hover:bg-white/10")}>
                  Redeem it for a $20 gift card
                </button>
                <p className="-mt-2 text-xs text-white/70">Guaranteed, to spend at the event.</p>
                {/* The two look alike on purpose: nothing should hint that keeping it is better. */}
                <button type="button" onClick={() => choose("kept")} className={buttonClass("outline", "w-full border-white text-white hover:bg-white/10")}>
                  Keep the Joker
                </button>
              </div>
            )}
          </>
        )}
        {step === "about" && (
          <>
            <h1 className="text-center text-2xl font-bold uppercase">Tell us about yourself</h1>
            <p className="text-center text-sm text-white/80">A line about you, shown with your name to the other guests.</p>
            <input value={tagline} onChange={(e) => setTagline(e.target.value)} maxLength={80} placeholder="e.g. joyful enthusiast" aria-label="About you"
              className="h-14 w-full rounded-md bg-white px-5 text-ink outline-none" />
            {!vipMember && (
              <div className="rounded-md border border-white/40 p-4 text-sm">
                <p className="mb-1 text-xs font-bold uppercase tracking-widest">VIP upgrade</p>
                <p className="text-white/80">Any membership from $25 a month makes you a VIP: buy the limited-edition art before the event, and take the auction&apos;s early Buy Now deals.</p>
                {/* A new tab, so the card picked here isn't lost. */}
                <a href="/membership" target="_blank" rel="noopener" className="mt-2 inline-block font-semibold underline">See memberships</a>
              </div>
            )}
          </>
        )}
        {step === "claim" && (
          <>
            <h1 className="text-center text-2xl font-bold uppercase">Claim your card</h1>
            <div className="grid grid-cols-2 gap-3">
              {([[false, "At the door"], [true, "Ship it to me"]] as const).map(([v, label]) => (
                <button key={label} type="button" onClick={() => setShip(v)} aria-pressed={ship === v}
                  className={`h-14 rounded-full border text-sm font-bold ${ship === v ? "border-white bg-white text-ink" : "border-white/50"}`}>
                  {label}
                </button>
              ))}
            </div>
            {ship && <textarea name="address" rows={3} defaultValue={shipAddress} placeholder="Shipping address" className="w-full rounded-md bg-white p-4 text-sm text-ink outline-none" />}
            {event.terms && (
              <details className="text-xs text-white/70">
                <summary className="cursor-pointer text-center">Registering means you agree to the event&apos;s <span className="underline">terms</span>.</summary>
                <div className="mt-2 max-h-40 space-y-2 overflow-y-auto text-left leading-relaxed">{event.terms.split("\n").map((line) => <p key={line}>{line}</p>)}</div>
              </details>
            )}
            {state?.error && <p role="alert" className="text-center text-sm text-[#ff8a80]">{state.error}</p>}
            <button disabled={pending} className={buttonClass("outline", "border-white text-white hover:bg-white/10")}>
              {pending ? "Saving…" : "Finish"}
            </button>
          </>
        )}
      </div>

      <div className="flex items-center justify-between">
        <button type="button" aria-label="Back" disabled={index === 0} onClick={() => setIndex((i) => i - 1)}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-white/15 disabled:opacity-30"><ArrowLeft className="size-5" /></button>
        <span className="flex gap-2" aria-label={`Step ${index + 1} of ${steps.length}`}>
          {steps.map((s, i) => <span key={s} className={`size-1.5 rounded-full ${i === index ? "bg-white" : "bg-white/40"}`} />)}
        </span>
        <button type="button" aria-label="Next" disabled={!canGoOn} onClick={next}
          className="flex h-12 w-20 items-center justify-center rounded-full bg-white/70 text-ink disabled:opacity-30"><ArrowRight className="size-5" /></button>
      </div>
    </form>
  );
}

function Done({ design, jokerChoice, ship, slug, code, qr, event, vipMember }: NonNullable<NonNullable<RegistrationState>["done"]> & {
  event: { title: string; place: string; when: string };
  vipMember: boolean;
}) {
  const name = CARD_DESIGNS[design].name;
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-5 overflow-y-auto px-8 py-6 text-center">
      <p className="text-2xl font-bold">You&apos;re registered.</p>
      <p className="text-sm text-white/80">{event.title} · {event.place} · {event.when}</p>
      <p>{ship ? `We'll mail your ${name} card.` : `Your ${name} card is waiting for you at the door.`}</p>
      {jokerChoice === "kept" && <p className="font-semibold">You kept the Joker. That means VIP access at the event.</p>}
      {jokerChoice === "gift_card" && <p className="font-semibold">Your $20 gift card is ready to spend at the event.</p>}
      {!ship && (
        <div className="rounded-md bg-white p-4 text-ink">
          <span className="block" dangerouslySetInnerHTML={{ __html: qr }} role="img" aria-label={`Check-in code ${code}`} />
          <p className="mt-2 font-mono text-sm font-bold">{code}</p>
          <p className="text-xs text-muted">Show this at the door. It&apos;s also in My Cards.</p>
        </div>
      )}
      {/* Registration leads to the Connections Messenger (development overview page 2). */}
      <div className="flex w-full flex-col gap-3">
        <Link href="/chat" className={buttonClass("outline", "border-white bg-white text-ink hover:bg-white/90")}>Open the Connections Messenger</Link>
        <Link href={`/events/${slug}`} className={buttonClass("outline", "border-white text-white hover:bg-white/10")}>See the event</Link>
        <Link href="/profile/cards" className="text-sm font-semibold underline">My cards</Link>
      </div>
      {!vipMember && (
        <p className="text-xs text-white/70">
          Art is for VIP members. <Link href="/membership" className="font-semibold underline">Become a VIP</Link> from $25 a month.
        </p>
      )}
    </div>
  );
}
