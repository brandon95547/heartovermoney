import { eventDate } from "@/lib/format";

// "Public Event Contract for @Host in City", the event's name and date.
export function EventHeading({ host, city, title, startsAt }: { host: string; city: string; title: string; startsAt: Date }) {
  return (
    <div>
      <p className="text-xs">Public Event Contract for <span className="underline">@{host.replace(/\s+/g, "")}</span> in <span className="underline">{city}</span></p>
      <h2 className="mt-1 text-xl font-bold">{title}</h2>
      <p className="text-xs text-muted">{eventDate(startsAt)}</p>
    </div>
  );
}
