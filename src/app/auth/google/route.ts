// "Continue with Google": off to Google's account picker, remembering where to come back to.
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { GOOGLE_COOKIE, googleConfigured, googleStart } from "@/lib/google";
import { safeNext } from "@/lib/next-path";

export async function GET(request: NextRequest) {
  const next = safeNext(request.nextUrl.searchParams.get("next"));
  if (!googleConfigured()) {
    return new Response(null, { status: 303, headers: { Location: `/signin?error=google-setup&next=${encodeURIComponent(next)}` } });
  }
  const { url, state, verifier } = googleStart();
  (await cookies()).set(GOOGLE_COOKIE, JSON.stringify({ state, verifier, next }), {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/auth/google", maxAge: 600,
  });
  return new Response(null, { status: 303, headers: { Location: url } });
}
