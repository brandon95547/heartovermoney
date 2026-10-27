"use client";

// Small interactive pieces of the event pages.
import { useActionState, useEffect, useOptimistic, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Forward, Heart, Share, ThumbsDown, Trash2 } from "lucide-react";
import { orderFood, postPhoto, removePhoto, toggleDownvote, toggleLike, type EventActionState } from "@/app/actions/events";
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

// Enough thumbs-downs take a photo off the wall; the count isn't shown, so it can't snowball.
export function DownvoteButton({ photoId, slug, downvoted }: { photoId: string; slug: string; downvoted: boolean }) {
  const [on, setOptimistic] = useOptimistic(downvoted);
  const [, start] = useTransition();
  return (
    <button type="button" aria-pressed={on} aria-label={on ? "Undo thumbs down" : "Thumbs down"}
      onClick={() => start(async () => { setOptimistic(!on); await toggleDownvote(photoId, slug); })}
      className="drop-shadow">
      <ThumbsDown className={`size-7 ${on ? "fill-white" : ""}`} strokeWidth={1.5} />
    </button>
  );
}

// Shares a link with the phone's share sheet, or copies it where there is none. On the photo
// wall the "Link copied" note opens to the right; in a page header (`inHeader`), to the left.
export function ShareButton({ path, title, inHeader = false }: { path: string; title: string; inHeader?: boolean }) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const id = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(id);
  }, [copied]);
  const share = async () => {
    const url = new URL(path, window.location.origin).toString();
    if (navigator.share) {
      try { await navigator.share({ title, url }); } catch { /* closed without sharing */ }
      return;
    }
    await navigator.clipboard?.writeText(url);
    setCopied(true);
  };
  return (
    <button type="button" onClick={share} aria-label="Share" className={`relative ${inHeader ? "flex h-full items-center" : "drop-shadow"}`}>
      {inHeader ? <Share className="size-5" strokeWidth={1.5} /> : <Forward className="size-7" strokeWidth={1.5} />}
      {copied && (
        <span role="status" className={`absolute top-1/2 -translate-y-1/2 whitespace-nowrap rounded-full bg-white px-3 py-1 text-xs font-bold text-ink shadow ${inHeader ? "right-full mr-2" : "left-full ml-2"}`}>
          Link copied
        </span>
      )}
    </button>
  );
}

// Admins only. The first tap asks, the second removes, so a stray tap can't take a photo down.
export function RemovePhotoButton({ photoId, slug }: { photoId: string; slug: string }) {
  const [armed, setArmed] = useState(false);
  const [pending, start] = useTransition();
  useEffect(() => {
    if (!armed) return;
    const id = setTimeout(() => setArmed(false), 4000);
    return () => clearTimeout(id);
  }, [armed]);
  return (
    <button type="button" disabled={pending} aria-label={armed ? "Tap again to remove this photo" : "Remove photo"}
      onClick={() => (armed ? start(() => removePhoto(photoId, slug)) : setArmed(true))}
      className="relative drop-shadow">
      <Trash2 className={`size-6 ${armed ? "text-alert" : ""}`} strokeWidth={1.5} />
      {armed && (
        <span className="absolute left-full top-1/2 ml-2 -translate-y-1/2 whitespace-nowrap rounded-full bg-alert px-3 py-1 text-xs font-bold">
          Tap again to remove
        </span>
      )}
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
