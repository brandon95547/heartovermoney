// The session: a signed, httpOnly cookie holding the user's id. Set and cleared only from
// Server Actions (Next.js does not allow cookies to be written while rendering).
import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { moveGuestCartTo } from "@/lib/guest-cart";

const COOKIE = "hom_session";
const DAYS = 30;
const key = new TextEncoder().encode(process.env.SESSION_SECRET);

export async function createSession(userId: string) {
  const expires = new Date(Date.now() + DAYS * 86_400_000);
  const token = await new SignJWT({ userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expires)
    .sign(key);
  (await cookies()).set(COOKIE, token, {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", expires,
  });
  // Whatever they put in the cart before signing in comes with them.
  await moveGuestCartTo(userId);
}

export async function deleteSession() {
  (await cookies()).delete(COOKIE);
}

export async function readSession(): Promise<{ userId: string } | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key, { algorithms: ["HS256"] });
    return typeof payload.userId === "string" ? { userId: payload.userId } : null;
  } catch {
    return null;
  }
}
