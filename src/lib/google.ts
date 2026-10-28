// Sign in with Google (OpenID Connect, with PKCE). /auth/google sends the visitor to Google;
// Google sends them back to /auth/google/callback, which signs them in to the account with the
// same email, creating one if there is none. Needs GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET,
// from an OAuth client in Google Cloud whose redirect URI is SITE_URL + /auth/google/callback.
import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { siteUrl } from "@/lib/site";

export const GOOGLE_COOKIE = "hom_google";

const clientId = () => process.env.GOOGLE_CLIENT_ID ?? "";
const clientSecret = () => process.env.GOOGLE_CLIENT_SECRET ?? "";
const redirectUri = () => `${siteUrl()}/auth/google/callback`;
const googleKeys = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));
const base64url = (b: Buffer) => b.toString("base64url");

export const googleConfigured = () => Boolean(clientId() && clientSecret());

// The address at Google, and what to keep in a short-lived cookie to check the way back.
export function googleStart() {
  const state = base64url(randomBytes(24));
  const verifier = base64url(randomBytes(32));
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.search = new URLSearchParams({
    client_id: clientId(), redirect_uri: redirectUri(), response_type: "code", scope: "openid email profile",
    state, code_challenge: base64url(createHash("sha256").update(verifier).digest()), code_challenge_method: "S256",
    prompt: "select_account",
  }).toString();
  return { url: url.toString(), state, verifier };
}

// Trades the code Google sent back for the person's verified email and name.
export async function googleFinish(code: string, verifier: string): Promise<{ email: string; name: string } | null> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code, code_verifier: verifier, client_id: clientId(), client_secret: clientSecret(),
      redirect_uri: redirectUri(), grant_type: "authorization_code",
    }),
  });
  if (!res.ok) return null;
  const { id_token } = (await res.json()) as { id_token?: string };
  if (!id_token) return null;
  const { payload } = await jwtVerify(id_token, googleKeys, {
    issuer: ["https://accounts.google.com", "accounts.google.com"], audience: clientId(),
  });
  if (payload.email_verified !== true || typeof payload.email !== "string") return null;
  return { email: payload.email.toLowerCase(), name: typeof payload.name === "string" ? payload.name.slice(0, 60) : "" };
}
