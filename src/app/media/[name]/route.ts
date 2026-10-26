// Serves posted photos from the upload folder. Names are the UUIDs postPhoto gave them, so
// anything else is refused rather than looked up.
import fs from "node:fs/promises";
import { uploadPath } from "@/lib/uploads";

const TYPES: Record<string, string> = { jpg: "image/jpeg", png: "image/png", webp: "image/webp" };

export async function GET(_: Request, ctx: RouteContext<"/media/[name]">) {
  const { name } = await ctx.params;
  const m = /^[0-9a-f-]{36}\.(jpg|png|webp)$/.exec(name);
  if (!m) return new Response("Not found", { status: 404 });
  try {
    const bytes = await fs.readFile(uploadPath(name));
    return new Response(bytes, {
      headers: { "Content-Type": TYPES[m[1]], "Cache-Control": "public, max-age=31536000, immutable" },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
