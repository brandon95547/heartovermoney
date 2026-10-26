// Shared building blocks, styled after the screen designs.
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

const BUTTON = {
  primary: "bg-charcoal text-white hover:bg-ink",
  black: "bg-ink text-white hover:bg-charcoal",
  outline: "border border-ink text-ink hover:bg-fog",
  quiet: "bg-mist text-charcoal hover:bg-line",
} as const;

// The pill buttons of the designs ("Buy Now", "Place order", "SIGN IN").
export function buttonClass(variant: keyof typeof BUTTON = "primary", extra = "") {
  return `inline-flex h-12 items-center justify-center gap-2 rounded-full px-6 text-sm font-bold transition-colors disabled:cursor-not-allowed disabled:bg-mist disabled:text-white ${BUTTON[variant]} ${extra}`;
}

// "‹  BUY NOW": back link on the left, the screen's name centered in capitals.
export function PageHeader({ title, back, right }: { title: string; back?: string; right?: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-30 grid h-14 grid-cols-[3rem_1fr_3rem] items-center border-b border-line bg-paper/95 backdrop-blur">
      {back ? (
        <Link href={back} aria-label="Back" className="flex h-full items-center justify-center">
          <ChevronLeft className="size-6" strokeWidth={1.5} />
        </Link>
      ) : <span />}
      <h1 className="truncate text-center text-sm font-medium uppercase tracking-[0.12em]">{title}</h1>
      <div className="flex justify-center">{right}</div>
    </header>
  );
}

export function SectionLabel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <h2 className={`text-[11px] font-bold uppercase tracking-[0.14em] text-charcoal ${className}`}>{children}</h2>;
}

// The COST bar: a dark label block, the share reached so far, and a dashed mark at the goal.
export function ProgressBar({ label, percent, tone = "ink", goalAt = 70 }: { label: string; percent: number; tone?: "ink" | "go" | "vip"; goalAt?: number }) {
  const fill = { ink: "bg-charcoal/80", go: "bg-go", vip: "bg-vip" }[tone];
  const p = Math.max(0, Math.min(100, percent));
  return (
    <div className="relative h-8 overflow-hidden rounded-md bg-mist" role="progressbar" aria-label={label} aria-valuenow={Math.round(p)} aria-valuemin={0} aria-valuemax={100}>
      <div className={`absolute inset-y-0 left-0 ${fill}`} style={{ width: `${p}%` }} />
      <span className="absolute inset-y-0 left-0 flex items-center rounded-l-md bg-charcoal px-3 text-[11px] font-semibold uppercase tracking-wide text-white">{label}</span>
      <span className="absolute inset-y-[-4px] border-l border-dashed border-ink" style={{ left: `${goalAt}%` }} aria-hidden />
    </div>
  );
}

export function Field({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="sr-only">{label}</span>
      <input {...props} placeholder={props.placeholder ?? label}
        className="h-14 w-full rounded-md bg-fog px-5 text-sm outline-none ring-ink/20 placeholder:text-muted focus:ring-2" />
    </label>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded-lg border border-dashed border-line px-4 py-8 text-center text-sm text-muted">{children}</p>;
}

export function Skeleton({ className = "h-40" }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-mist ${className}`} />;
}
