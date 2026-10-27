import { saveEvent } from "@/app/actions/admin/events";
import { AdminForm } from "@/components/admin-form";
import { DateTimeField, MoneyField, SelectField, TextArea, TextField } from "@/components/admin-ui";
import type { schema } from "@/db";

type Event = typeof schema.events.$inferSelect;

export function EventForm({ event, cities }: { event?: Event; cities: { id: string; name: string; state: string }[] }) {
  return (
    <AdminForm action={saveEvent} submit={event ? "Save" : "Add the event"}>
      {event && <input type="hidden" name="id" value={event.id} />}
      <TextField label="Title" name="title" required maxLength={120} defaultValue={event?.title} placeholder="Art + Charity" />
      <TextField label="Address" name="slug" maxLength={60} defaultValue={event?.slug} hint="heartovermoney.com/events/… — made from the title and year if empty" />
      <div className="grid grid-cols-2 gap-3">
        <SelectField label="City" name="cityId" required defaultValue={event?.cityId} options={cities.map((c) => [c.id, `${c.name}, ${c.state}`] as const)} />
        <DateTimeField label="Starts" name="startsAt" required value={event?.startsAt} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <TextField label="Venue" name="venue" required maxLength={120} defaultValue={event?.venue} />
        <TextField label="Host" name="hostName" required maxLength={120} defaultValue={event?.hostName ?? "Heart Over Money"} />
      </div>
      <TextArea label="Description" name="description" required rows={4} defaultValue={event?.description} />
      <div className="grid grid-cols-3 gap-3">
        <MoneyField label="Cost goal" name="cost" required cents={event?.costCents} />
        <TextField label="Charity" name="charityName" required maxLength={120} defaultValue={event?.charityName} />
        <TextField label="Charity's share %" name="charityPercent" type="number" min={0} max={100} required defaultValue={event?.charityPercent ?? 50} />
      </div>
      <TextArea label="Sponsors" name="sponsors" rows={3} defaultValue={event?.sponsors.map((sp) => sp.name).join("\n")} hint="One per line" />
      <TextArea label="Documents" name="documents" rows={3} defaultValue={event?.documents.map((d) => `${d.name} | ${d.url}`).join("\n")}
        hint="One per line: Name | address (https://… or /documents/…). Without an address it shows as shared soon." />
      <TextArea label="Terms of the contract" name="terms" rows={5} defaultValue={event?.terms} hint="One paragraph per line" />
    </AdminForm>
  );
}
