import { saveFilm } from "@/app/actions/admin/content";
import { AdminForm } from "@/components/admin-form";
import { DateTimeField, ImagesField, SelectField, TextArea, TextField } from "@/components/admin-ui";
import { ArtImage } from "@/components/art-image";
import type { schema } from "@/db";
import { filmKindLabel } from "@/lib/format";

type Film = typeof schema.films.$inferSelect;

export function FilmForm({ film, cities }: { film?: Film; cities: { id: string; name: string; state: string }[] }) {
  return (
    <AdminForm action={saveFilm} submit={film ? "Save" : "Add the film"}>
      {film && <input type="hidden" name="id" value={film.id} />}
      <TextField label="Title" name="title" required maxLength={120} defaultValue={film?.title} />
      <TextField label="Address" name="slug" maxLength={60} defaultValue={film?.slug} hint="heartovermoney.com/films/… — made from the title if empty" />
      <div className="grid grid-cols-2 gap-3">
        <SelectField label="Kind" name="kind" required defaultValue={film?.kind ?? "music_video"} options={Object.entries(filmKindLabel).map(([k, v]) => [k, v] as const)} />
        <SelectField label="City" name="cityId" defaultValue={film?.cityId ?? ""} options={[["", "None"], ...cities.map((c) => [c.id, `${c.name}, ${c.state}`] as const)]} />
      </div>
      <TextField label="Summary" name="summary" required maxLength={300} defaultValue={film?.summary} hint="One sentence, shown in bold" />
      <TextArea label="The story" name="body" required rows={6} defaultValue={film?.body} />
      <div className="grid grid-cols-2 gap-3">
        <TextField label="Video address" name="videoUrl" type="url" maxLength={500} defaultValue={film?.videoUrl ?? ""} placeholder="https://" hint="Empty: the page says it premieres soon" />
        <TextField label="Minutes" name="minutes" type="number" min={1} defaultValue={film?.minutes ?? ""} />
      </div>
      <DateTimeField label="Published" name="publishedAt" value={film?.publishedAt} hint="Eastern time. Now if empty." />
      {film && <div className="relative aspect-video overflow-hidden rounded-md bg-mist"><ArtImage src={film.poster} alt="The poster" /></div>}
      <ImagesField label={film ? "Replace the poster" : "Poster"} name="poster" multiple={false} />
    </AdminForm>
  );
}
