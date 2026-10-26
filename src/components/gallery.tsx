"use client";

// Swipeable photos with dots, as on the art and auction screens.
import { useRef, useState } from "react";
import { ArtImage } from "@/components/art-image";

export function Gallery({ images, alt, aspect = "aspect-square" }: { images: string[]; alt: string; aspect?: string }) {
  const [index, setIndex] = useState(0);
  const strip = useRef<HTMLDivElement>(null);
  return (
    <div className="relative">
      <div ref={strip} className="flex snap-x snap-mandatory overflow-x-auto [scrollbar-width:none]"
        onScroll={(e) => setIndex(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}>
        {images.map((src, i) => (
          <div key={src} className={`relative w-full shrink-0 snap-center ${aspect} bg-mist`}>
            <ArtImage src={src} alt={`${alt}${images.length > 1 ? ` (${i + 1} of ${images.length})` : ""}`} priority={i === 0} />
          </div>
        ))}
      </div>
      {images.length > 1 && (
        <div className="absolute inset-x-0 bottom-3 flex justify-center gap-2">
          {images.map((src, i) => (
            <button key={src} type="button" aria-label={`Photo ${i + 1}`}
              onClick={() => strip.current?.scrollTo({ left: i * strip.current.clientWidth, behavior: "smooth" })}
              className={`size-2 rounded-full ${i === index ? "bg-white" : "bg-white/50"}`} />
          ))}
        </div>
      )}
    </div>
  );
}
