"use client";

// The Connections Messenger's interactive pieces (design page 3): its tab icons, the countdown
// to when connections close, the conversation rows that swipe left to the red +, and the
// conversation's message box.
import Link from "next/link";
import { useActionState, useEffect, useRef, useState, useSyncExternalStore, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowUp, Check, ChevronRight, Plus } from "lucide-react";
import { connectWith, markRead, sendMessage } from "@/app/actions/messenger";
import type { ConnectState } from "@/lib/messenger";

// The tab icons as drawn on design page 3: a round speech bubble with a curled tail, and two
// interlocking chain links.
export function BubbleIcon({ className = "size-[25px]" }: { className?: string }) {
  return (
    <svg viewBox="11 0 64 64" aria-hidden className={className} fill="none" stroke="currentColor" strokeWidth={5} strokeLinejoin="round" strokeLinecap="round">
      <path d="M30.3 55.9A28 28 0 1 0 19.2 45.7C20 52 18.5 57.5 15 61C20 60.5 26 58.5 30.3 55.9Z" />
    </svg>
  );
}

export function ChainIcon({ className = "h-5 w-10" }: { className?: string }) {
  return (
    <svg viewBox="4 4 110 56" aria-hidden className={className} fill="none" stroke="currentColor" strokeWidth={6} strokeLinecap="round">
      <path d="M68.3 36.8V29A19 19 0 0 0 49.3 10H28.3A19 19 0 0 0 9.3 29V34.7A19 19 0 0 0 28.3 53.7H44" />
      <path d="M75.7 10H88.8A19 19 0 0 1 107.8 29V34.7A19 19 0 0 1 88.8 53.7H70.5A19 19 0 0 1 51.5 34.7V26.8" />
    </svg>
  );
}

// "TIME LEFT BEFORE DELETE 5:23:21", ticking each second, in hours past a day ("94:37:18").
// When it runs out the page reloads, without the conversations that were deleted.
const everySecond = (tick: () => void) => { const id = setInterval(tick, 1000); return () => clearInterval(id); };

export function TimeLeft({ until }: { until: string }) {
  const router = useRouter();
  const now = useSyncExternalStore(everySecond, () => Math.floor(Date.now() / 1000), () => null);
  const left = now === null ? null : Math.max(0, Math.floor(Date.parse(until) / 1000) - now);
  useEffect(() => { if (left === 0) router.refresh(); }, [left, router]);
  if (left === null) return null;
  const mmss = [Math.floor((left % 3600) / 60), left % 60].map((n) => String(n).padStart(2, "0")).join(":");
  return (
    <p className="whitespace-nowrap text-[11px] uppercase tracking-[0.02em] text-alert">
      Time left before delete <b className="tabular-nums">{Math.floor(left / 3600)}:{mmss}</b>
    </p>
  );
}

// The red + behind a conversation: connect with this guest. Once tapped, it shows that this
// guest has asked (a check) or, when the other has too, that they're connected (the chain).
function ConnectPanel({ username, name, state, canConnect, onDone }: {
  username: string; name: string; state: ConnectState; canConnect: boolean; onDone: () => void;
}) {
  const [pending, start] = useTransition();
  if (state === "none" && canConnect) {
    return (
      <button type="button" disabled={pending} aria-label={`Connect with ${name}`}
        onClick={() => start(async () => { await connectWith(username); setTimeout(onDone, 1500); })}
        className="flex h-full w-full items-center justify-center bg-alert text-white disabled:opacity-80">
        <Plus className="size-9" strokeWidth={1.5} />
      </button>
    );
  }
  return (
    <span className="flex h-full w-full flex-col items-center justify-center gap-1 bg-charcoal text-xs font-semibold text-white">
      {state === "connected" ? <ChainIcon className="h-4 w-8" /> : <Check className="size-6" strokeWidth={2} />}
      {state === "connected" ? "Connected" : "Asked"}
    </span>
  );
}

const REVEAL = 76;

// One conversation in the Messages list (design page 3): who, when, the latest message in two
// lines, and an arrow. Swiped left, it shows the red + (a keyboard reaches it with Tab).
export function ConversationRow({ username, name, time, preview, unread, state, canConnect }: {
  username: string; name: string; time: string; preview: string; unread: number; state: ConnectState; canConnect: boolean;
}) {
  const [x, setX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const drag = useRef<{ x: number; y: number; base: number; on: boolean } | null>(null);
  const swiped = useRef(false);

  const down = (e: React.PointerEvent) => {
    drag.current = { x: e.clientX, y: e.clientY, base: x, on: false };
    swiped.current = false;
  };
  const move = (e: React.PointerEvent<HTMLElement>) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.x, dy = e.clientY - d.y;
    if (!d.on) {
      if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) { drag.current = null; return; }
      if (Math.abs(dx) < 8) return;
      d.on = true;
      swiped.current = true;
      setDragging(true);
      try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* the pointer is already gone */ }
    }
    setX(Math.max(-REVEAL, Math.min(0, d.base + dx)));
  };
  const up = () => {
    const d = drag.current;
    drag.current = null;
    if (!d?.on) return;
    setDragging(false);
    setX((v) => (v < -REVEAL / 2 ? -REVEAL : 0));
  };

  return (
    <li className="relative overflow-hidden">
      {/* Hidden while the row is closed, so no edge of it shows past the row. */}
      <div className={`absolute inset-y-0 right-0 ${x === 0 && !dragging ? "opacity-0" : ""}`} style={{ width: REVEAL }}
        onFocus={() => setX(-REVEAL)} onBlur={() => setX(0)}>
        <ConnectPanel username={username} name={name} state={state} canConnect={canConnect} onDone={() => setX(0)} />
      </div>
      <Link href={`/chat/${username}`} draggable={false}
        onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
        onClickCapture={(e) => {
          // The click that ends a swipe, or a tap on a row that's open, doesn't open the conversation.
          if (swiped.current) { e.preventDefault(); swiped.current = false; }
          else if (x !== 0) { e.preventDefault(); setX(0); }
        }}
        style={{ transform: `translateX(${x}px)`, touchAction: "pan-y" }}
        className={`relative flex gap-3 bg-paper px-4 py-3 select-none ${dragging ? "" : "transition-transform duration-200"}`}>
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-mist font-bold">{name[0]}</span>
        <span className="min-w-0 flex-1 border-b border-line pb-3">
          <span className="flex items-baseline justify-between gap-2">
            <span className={`flex min-w-0 items-center gap-2 text-[17px] ${unread ? "font-semibold" : ""}`}>
              <span className="truncate">{name}</span>
              {state === "connected" && <ChainIcon className="h-3 w-6 shrink-0 text-muted" />}
            </span>
            <span className="flex shrink-0 items-center gap-1 text-sm text-muted">
              {time}<ChevronRight className="size-4 text-line" strokeWidth={2} />
            </span>
          </span>
          <span className={`mt-0.5 line-clamp-2 text-[15px] leading-snug ${unread ? "text-ink" : "text-muted"}`}>
            {unread ? <span className="sr-only">{unread} unread: </span> : null}{preview}
          </span>
        </span>
      </Link>
    </li>
  );
}

// In a conversation: the + in its header, the same as swiping the conversation in the list.
export function ConnectButton({ username, name, state, canConnect }: { username: string; name: string; state: ConnectState; canConnect: boolean }) {
  const [pending, start] = useTransition();
  if (state === "connected") return <span title="Connected" className="flex h-full items-center"><ChainIcon className="h-4 w-8" /><span className="sr-only">Connected</span></span>;
  if (state === "asked") return <span title={`You asked to connect with ${name}`} className="flex h-full items-center"><Check className="size-5" /><span className="sr-only">Asked to connect</span></span>;
  if (!canConnect) return null;
  return (
    <button type="button" disabled={pending} onClick={() => start(() => connectWith(username))} aria-label={`Connect with ${name}`} title={`Connect with ${name}`}
      className="flex size-9 items-center justify-center rounded-md bg-alert text-white disabled:opacity-80">
      <Plus className="size-6" strokeWidth={1.75} />
    </button>
  );
}

// The message box at the foot of a conversation, above the bottom icons.
export function Composer({ to }: { to: string }) {
  const [state, action, pending] = useActionState(sendMessage, undefined);
  return (
    <form action={action} className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 mx-auto max-w-md border-t border-line bg-paper md:max-w-2xl">
      <div className="px-4 py-3">
        {state?.error && <p role="alert" className="mb-2 text-sm text-alert">{state.error}</p>}
        <div className="flex items-center gap-2">
          <input type="hidden" name="to" value={to} />
          <label className="flex-1">
            <span className="sr-only">Message</span>
            <input name="body" required maxLength={2000} autoComplete="off" placeholder="Message…"
              className="h-12 w-full rounded-full bg-fog px-5 text-[15px] outline-none focus:ring-2 focus:ring-ink/20" />
          </label>
          <button disabled={pending} aria-label="Send" className="flex size-12 shrink-0 items-center justify-center rounded-full bg-ink text-white disabled:opacity-60">
            <ArrowUp className="size-5" strokeWidth={2} />
          </button>
        </div>
      </div>
    </form>
  );
}

// While a conversation is open, and each time a message arrives: marks theirs read, and
// scrolls down to the newest.
export function ConversationEffects({ username, latest }: { username: string; latest: string | null }) {
  useEffect(() => {
    void markRead(username);
    window.scrollTo({ top: document.documentElement.scrollHeight });
  }, [username, latest]);
  return null;
}
