"use client";

// Sign in and create account (screen design page 1): the mark, email and password, a black
// pill button, Continue with Google, and the way to the other form underneath.
import Link from "next/link";
import { useActionState, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Check, Eye, EyeOff } from "lucide-react";
import { signIn, signUp, type AuthState } from "@/app/actions/auth";
import { Field, buttonClass } from "@/components/ui";

// The password field, with an eye that shows or hides what was typed.
function PasswordField({ autoComplete }: { autoComplete: string }) {
  const [shown, setShown] = useState(false);
  const Icon = shown ? EyeOff : Eye;
  return (
    <div className="relative">
      <Field label="Your password" name="password" type={shown ? "text" : "password"} autoComplete={autoComplete} required minLength={8}
        style={{ paddingRight: "3.5rem" }} />
      <button type="button" onClick={() => setShown((s) => !s)} aria-label={shown ? "Hide password" : "Show password"} title={shown ? "Hide password" : "Show password"}
        className="absolute inset-y-0 right-3 my-auto flex size-10 items-center justify-center rounded-full text-muted hover:text-ink">
        <Icon className="size-5" strokeWidth={1.75} />
      </button>
    </div>
  );
}

// The form's own error, or one Google sign-in sent back (`?error=google`).
const GOOGLE_ERRORS: Record<string, string> = {
  google: "Signing in with Google didn't go through. Please try again.",
  "google-setup": "Sign in with Google isn't switched on yet.",
};

function FormError({ state }: { state: AuthState }) {
  const fromGoogle = GOOGLE_ERRORS[useSearchParams().get("error") ?? ""];
  const error = state?.error ?? fromGoogle;
  return error ? <p role="alert" className="text-center text-sm text-alert">{error}</p> : null;
}

// A plain link, not <Link>: /auth/google is a route that leaves the site for Google.
function GoogleButton({ next }: { next: string }) {
  return (
    <a href={`/auth/google?next=${encodeURIComponent(next)}`} className={buttonClass("outline", "w-full gap-3 uppercase tracking-[0.08em]")}>
      <svg viewBox="0 0 48 48" aria-hidden className="size-5 shrink-0">
        <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.6-.4-3.9z" />
        <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
        <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2A11.9 11.9 0 0 1 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
        <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3a12 12 0 0 1-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.9z" />
      </svg>
      Continue with Google
    </a>
  );
}

// The email field of the design, with its green check once the address looks complete.
function EmailField({ defaultValue }: { defaultValue?: string }) {
  const [value, setValue] = useState(defaultValue ?? "");
  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());
  return (
    <div className="relative">
      <Field label="Email" name="email" type="email" autoComplete="email" required value={value} onChange={(e) => setValue(e.target.value)} />
      {valid && (
        <span aria-hidden className="absolute inset-y-0 right-4 my-auto flex size-7 items-center justify-center rounded-md bg-gradient-to-b from-[#7fd58b] to-[#4fba5f] text-ink">
          <Check className="size-4" strokeWidth={2.5} />
        </span>
      )}
    </div>
  );
}

export function SignInForm() {
  const next = useSearchParams().get("next") ?? "/";
  const [state, action, pending] = useActionState(signIn, undefined);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <EmailField key={state?.fields?.email} defaultValue={state?.fields?.email} />
      <PasswordField autoComplete="current-password" />
      <FormError state={state} />
      <button disabled={pending} className={buttonClass("black", "w-full tracking-[0.2em] uppercase")}>
        {pending ? "Signing in…" : "Sign in"}
      </button>
      <p className="text-center"><Link href="/reset-password" className="text-xs font-semibold uppercase tracking-[0.15em] text-muted underline-offset-4 hover:underline">Forgot details?</Link></p>
      <p className="py-1 text-center text-xs text-muted">OR</p>
      <GoogleButton next={next} />
      <Link href={`/signup?next=${encodeURIComponent(next)}`} className={buttonClass("outline", "w-full uppercase tracking-[0.2em]")}>
        Create account
      </Link>
    </form>
  );
}

export function SignUpForm() {
  const next = useSearchParams().get("next") ?? "/";
  const [state, action, pending] = useActionState(signUp, undefined);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <EmailField key={state?.fields?.email} defaultValue={state?.fields?.email} />
      <PasswordField autoComplete="new-password" />
      <FormError state={state} />
      <button disabled={pending} className={buttonClass("black", "w-full tracking-[0.2em] uppercase")}>
        {pending ? "Creating account…" : "Create account"}
      </button>
      <p className="py-1 text-center text-xs text-muted">OR</p>
      <GoogleButton next={next} />
      <p className="text-center text-sm">
        Already have an account? <Link href={`/signin?next=${encodeURIComponent(next)}`} className="font-semibold underline">Sign in</Link>
      </p>
    </form>
  );
}
