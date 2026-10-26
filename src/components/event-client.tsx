"use client";

// Small interactive pieces of the event pages.
import { useActionState, useEffect, useOptimistic, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import { orderFood, postPhoto, toggleLike, type EventActionState } from "@/app/actions/events";
import { buttonClass } from "@/components/ui";
import { money } from "@/lib/format";

// Swiping right to left on the overview opens the details (as the client described).
export function SwipeTo({ href, children }: { href: string; children: React.ReactNode }) {
  const router = useRouter();
  const start = useRef<{ x: number; y: number } | null>(null);
  return (
    <div
      onTouchStart={(e) => { start.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; }}
      onTouchEnd={(e) => {
        const s = start.current; start.current = null;
        if (!s) return;
        const dx = e.changedTouches[0].clientX - s.x;
        const dy = e.changedTouches[0].clientY - s.y;
        if (dx < -70 && Math.abs(dy) < 50) router.push(href);
      }}>
      {children}
    </div>
  );
}

// Re-renders the page every few seconds, so photos and sales appear as they are posted.
export function AutoRefresh({ seconds = 8 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => { if (document.visibilityState === "visible") router.refresh(); }, seconds * 1000);
    return () => clearInterval(id);
  }, [router, seconds]);
  return null;
}

export function LikeButton({ photoId, slug, liked, count }: { photoId: string; slug: string; liked: boolean; count: number }) {
  const [state, setOptimistic] = useOptimistic({ liked, count });
  const [, start] = useTransition();
  return (
    <button type="button" aria-pressed={state.liked} aria-label={state.liked ? "Unlike" : "Like"}
      onClick={() => start(async () => {
        setOptimistic({ liked: !state.liked, count: state.count + (state.liked ? -1 : 1) });
        await toggleLike(photoId, slug);
      })}
      className="flex flex-col items-center gap-1 text-xs drop-shadow">
      <Heart className={`size-8 ${state.liked ? "fill-white" : ""}`} strokeWidth={1.5} />
      {state.count.toLocaleString("en-US")}
    </button>
  );
}

function Message({ state }: { state: EventActionState }) {
  return state?.error ? <p role="alert" className="text-sm text-alert">{state.error}</p> : null;
}

export function PhotoForm({ slug }: { slug: string }) {
  const [state, action, pending] = useActionState(postPhoto, undefined);
  const [preview, setPreview] = useState<string | null>(null);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="slug" value={slug} />
      <label className="flex aspect-[4/5] cursor-pointer items-center justify-center overflow-hidden rounded-md bg-fog text-sm text-muted">
        {/* eslint-disable-next-line @next/next/no-img-element -- a local preview of the chosen file */}
        {preview ? <img src={preview} alt="Your photo" className="h-full w-full object-cover" /> : "Tap to choose a photo"}
        <input name="photo" type="file" accept="image/jpeg,image/png,image/webp" required className="sr-only"
          onChange={(e) => { const f = e.target.files?.[0]; setPreview(f ? URL.createObjectURL(f) : null); }} />
      </label>
      <input name="caption" maxLength={200} placeholder="Say something about it"
        className="h-12 w-full rounded-md bg-fog px-4 text-sm outline-none focus:ring-2 focus:ring-ink/20" />
      <Message state={state} />
      <button disabled={pending} className={buttonClass("black", "w-full")}>{pending ? "Posting…" : "Post to the photo wall"}</button>
    </form>
  );
}

type MenuItem = { id: string; name: string; category: string; priceCents: number };

export function MenuForm({ slug, items }: { slug: string; items: MenuItem[] }) {
  const [state, action, pending] = useActionState(orderFood, undefined);
  const [qty, setQty] = useState<Record<string, number>>({});
  const total = items.reduce((t, i) => t + i.priceCents * (qty[i.id] ?? 0), 0);
  const groups = [...new Set(items.map((i) => i.category))];
  const set = (id: string, n: number) => setQty((q) => ({ ...q, [id]: Math.max(0, Math.min(20, n)) }));
  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="slug" value={slug} />
      {groups.map((g) => (
        <section key={g}>
          <h2 className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em]">{g}</h2>
          <ul className="divide-y divide-line">
            {items.filter((i) => i.category === g).map((i) => (
              <li key={i.id} className="flex items-center justify-between py-3">
                <span><span className="block text-sm font-semibold">{i.name}</span><span className="text-xs text-muted">{money(i.priceCents, { cents: true })}</span></span>
                <span className="flex items-center gap-2">
                  <input type="hidden" name={`qty:${i.id}`} value={qty[i.id] ?? 0} />
                  <button type="button" aria-label={`One fewer ${i.name}`} onClick={() => set(i.id, (qty[i.id] ?? 0) - 1)} className="size-8 rounded-full bg-fog text-lg">−</button>
                  <span className="w-5 text-center text-sm font-semibold">{qty[i.id] ?? 0}</span>
                  <button type="button" aria-label={`One more ${i.name}`} onClick={() => set(i.id, (qty[i.id] ?? 0) + 1)} className="size-8 rounded-full bg-fog text-lg">+</button>
                </span>
              </li>
            ))}
          </ul>
        </section>
      ))}
      <Message state={state} />
      <button disabled={pending || total === 0} className={buttonClass("black", "w-full")}>
        {pending ? "Ordering…" : total ? `Place order · ${money(total, { cents: true })}` : "Choose items"}
      </button>
      <p className="text-center text-xs text-muted">Test mode: no card is charged. Pick up at the bar.</p>
    </form>
  );
}
