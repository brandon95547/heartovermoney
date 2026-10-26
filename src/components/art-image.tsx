import Image from "next/image";

// A picture that fills its (aspect-ratio) box. SVG placeholders skip the image optimizer,
// which only handles raster images; real photos go through it.
export function ArtImage({ src, alt, sizes = "(max-width: 768px) 100vw, 672px", priority = false, className = "" }: {
  src: string; alt: string; sizes?: string; priority?: boolean; className?: string;
}) {
  return (
    <Image src={src} alt={alt} fill sizes={sizes} priority={priority} unoptimized={src.endsWith(".svg")}
      className={`object-cover ${className}`} />
  );
}
