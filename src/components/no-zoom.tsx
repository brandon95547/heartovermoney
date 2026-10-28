"use client";

// Keeps the page at its own size, so a pinch can't push the bottom icons out of view (the
// client, October 2026). The viewport tag (layout.tsx) covers most browsers; Safari on iPhone
// ignores it, so its pinch gestures, and any two-finger move, are stopped here as well.
import { useEffect } from "react";

export function NoZoom() {
  useEffect(() => {
    const stop = (e: Event) => e.preventDefault();
    const twoFingers = (e: TouchEvent) => { if (e.touches.length > 1) e.preventDefault(); };
    const gestures = ["gesturestart", "gesturechange", "gestureend"];
    gestures.forEach((g) => document.addEventListener(g, stop, { passive: false }));
    document.addEventListener("touchmove", twoFingers, { passive: false });
    return () => {
      gestures.forEach((g) => document.removeEventListener(g, stop));
      document.removeEventListener("touchmove", twoFingers);
    };
  }, []);
  return null;
}
