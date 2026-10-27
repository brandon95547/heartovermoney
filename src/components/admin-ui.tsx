// Building blocks of the admin pages: labeled fields (with their current values filled in),
// titles, figures and status labels. No state, so they render on the server.
import Link from "next/link";
import { toEasternInput } from "@/lib/eastern";

const box = "w-full rounded-md bg-fog px-4 text-sm outline-none focus:ring-2 focus:ring-ink/20";

function Label({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

export function TextField({ label, hint, ...props }: { label: string; hint?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return <Label label={label} hint={hint}><input {...props} className={`h-11 ${box}`} /></Label>;
}

export function MoneyField({ label, hint, name, cents, required }: { label: string; hint?: string; name: string; cents?: number | null; required?: boolean }) {
  return (
    <Label label={label} hint={hint}>
      <span className="relative block">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-muted">$</span>
        <input name={name} type="number" min="0" step="0.01" inputMode="decimal" required={required}
          defaultValue={cents == null ? "" : (cents / 100).toFixed(2)} className={`h-11 pl-8 ${box}`} />
      </span>
    </Label>
  );
}

export function TextArea({ label, hint, rows = 4, ...props }: { label: string; hint?: string; rows?: number } & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <Label label={label} hint={hint}><textarea rows={rows} {...props} className={`py-3 ${box}`} /></Label>;
}

export function SelectField({ label, hint, options, ...props }: {
  label: string; hint?: string; options: readonly (readonly [string, string])[];
} & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <Label label={label} hint={hint}>
      <select {...props} className={`h-11 ${box}`}>
        {options.map(([value, text]) => <option key={value} value={value}>{text}</option>)}
      </select>
    </Label>
  );
}

export function CheckField({ label, name, defaultChecked }: { label: string; name: string; defaultChecked?: boolean }) {
  return (
    <label className="flex items-center gap-3 text-sm">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="size-5 accent-ink" />{label}
    </label>
  );
}

// A date and time typed in Eastern time.
export function DateTimeField({ label, name, value, required, hint }: { label: string; name: string; value?: Date | null; required?: boolean; hint?: string }) {
  return <TextField label={label} hint={hint ?? "Eastern time"} name={name} type="datetime-local" required={required} defaultValue={toEasternInput(value)} />;
}

export function ImagesField({ label = "Add pictures", name = "images", multiple = true }: { label?: string; name?: string; multiple?: boolean }) {
  return (
    <Label label={label} hint="JPEG, PNG or WebP, up to 12 MB each">
      <input type="file" name={name} accept="image/jpeg,image/png,image/webp" multiple={multiple}
        className="block w-full text-sm file:mr-3 file:rounded-full file:border-0 file:bg-ink file:px-4 file:py-2 file:text-xs file:font-bold file:text-white" />
    </Label>
  );
}

export function AdminTitle({ title, back, action }: { title: string; back?: { href: string; label: string }; action?: React.ReactNode }) {
  return (
    <div className="mb-5 space-y-1">
      {back && <Link href={back.href} className="text-xs font-semibold text-muted underline-offset-2 hover:underline">← {back.label}</Link>}
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold">{title}</h1>
        {action}
      </div>
    </div>
  );
}

export function Stat({ label, value, href }: { label: string; value: React.ReactNode; href?: string }) {
  const inner = (<><span className="block text-2xl font-bold">{value}</span><span className="text-xs text-muted">{label}</span></>);
  return href
    ? <Link href={href} className="block rounded-md border border-line p-4 hover:bg-fog">{inner}</Link>
    : <div className="rounded-md border border-line p-4">{inner}</div>;
}

const TONES = { neutral: "bg-fog text-charcoal", go: "bg-go/10 text-go", alert: "bg-alert/10 text-alert", vip: "bg-vip/10 text-vip", ink: "bg-ink text-white" };
export function Pill({ tone = "neutral", children }: { tone?: keyof typeof TONES; children: React.ReactNode }) {
  return <span className={`inline-block rounded px-2 py-0.5 text-[11px] font-semibold ${TONES[tone]}`}>{children}</span>;
}

export function Section({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-[11px] font-bold uppercase tracking-[0.14em] text-charcoal">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export const adminLink = "text-xs font-semibold underline";
