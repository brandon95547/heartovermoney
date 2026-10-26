"use client";

// Sign in and create account (screen design page 1): the mark, the fields, a black pill
// button, and the way to the other form underneath.
import Link from "next/link";
import { useActionState, useState } from "react";
import { useSearchParams } from "next/navigation";
import { signIn, signUp, type AuthState } from "@/app/actions/auth";
import { Field, buttonClass } from "@/components/ui";

function PasswordField({ autoComplete }: { autoComplete: string }) {
  const [shown, setShown] = useState(false);
  return (
    <div className="relative">
      <Field label="Your password" name="password" type={shown ? "text" : "password"} autoComplete={autoComplete} required minLength={8} />
      <button type="button" onClick={() => setShown((s) => !s)}
        className="absolute inset-y-0 right-4 my-auto h-7 rounded bg-paper px-2 text-[10px] font-bold uppercase">
        {shown ? "Hide" : "Show"}
      </button>
    </div>
  );
}

function FormError({ state }: { state: AuthState }) {
  return state?.error ? <p role="alert" className="text-center text-sm text-alert">{state.error}</p> : null;
}

// Shown when the link on a card (heartovermoney.com/events) sent the visitor here.
function ForTheEvent({ next }: { next: string }) {
  return next === "/events" ? <p className="text-center text-sm">Sign in or create an account to get your card for the next event.</p> : null;
}

export function SignInForm() {
  const next = useSearchParams().get("next") ?? "/";
  const [state, action, pending] = useActionState(signIn, undefined);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <ForTheEvent next={next} />
      <Field label="Email" name="email" type="email" autoComplete="email" required defaultValue={state?.fields?.email} />
      <PasswordField autoComplete="current-password" />
      <FormError state={state} />
      <button disabled={pending} className={buttonClass("black", "w-full tracking-[0.2em] uppercase")}>
        {pending ? "Signing in…" : "Sign in"}
      </button>
      <p className="py-1 text-center text-xs text-muted">OR</p>
      <Link href={`/signup?next=${encodeURIComponent(next)}`} className={buttonClass("outline", "w-full uppercase tracking-[0.2em]")}>
        Create account
      </Link>
    </form>
  );
}

export function SignUpForm() {
  const next = useSearchParams().get("next") ?? "/";
  const [state, action, pending] = useActionState(signUp, undefined);
  const f = state?.fields ?? {};
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <ForTheEvent next={next} />
      <Field label="Your name" name="displayName" autoComplete="name" required defaultValue={f.displayName} />
      <Field label="Username" name="username" autoComplete="username" required defaultValue={f.username} />
      <Field label="Email" name="email" type="email" autoComplete="email" required defaultValue={f.email} />
      <PasswordField autoComplete="new-password" />
      <Field label="Tell us about yourself (optional)" name="tagline" maxLength={80} defaultValue={f.tagline} />
      <FormError state={state} />
      <button disabled={pending} className={buttonClass("black", "w-full tracking-[0.2em] uppercase")}>
        {pending ? "Creating account…" : "Create account"}
      </button>
      <p className="text-center text-sm">
        Already have an account? <Link href={`/signin?next=${encodeURIComponent(next)}`} className="font-semibold underline">Sign in</Link>
      </p>
    </form>
  );
}
