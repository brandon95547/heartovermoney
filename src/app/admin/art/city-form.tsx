import { saveCity } from "@/app/actions/admin/art";
import { AdminForm } from "@/components/admin-form";
import { DateTimeField, ImagesField, TextArea, TextField } from "@/components/admin-ui";
import { ArtImage } from "@/components/art-image";

type City = { id: string; name: string; state: string; slug: string; story: string; songTitle: string | null; videoUrl: string | null; visitedOn: Date | null; heroImage: string };

// A collection: a city, its story (where its certificates' QR codes lead), song and cover.
export function CityForm({ city }: { city?: City }) {
  return (
    <AdminForm action={saveCity} submit={city ? "Save" : "Add the collection"}>
      {city && <input type="hidden" name="id" value={city.id} />}
      <div className="grid grid-cols-[1fr_5rem] gap-3">
        <TextField label="City" name="name" required maxLength={80} defaultValue={city?.name} />
        <TextField label="State" name="state" required maxLength={2} defaultValue={city?.state} placeholder="NC" />
      </div>
      <TextField label="Address" name="slug" maxLength={60} defaultValue={city?.slug} hint="heartovermoney.com/cities/… — made from the city if empty" />
      <DateTimeField label="Visited" name="visitedOn" value={city?.visitedOn} hint="Eastern time. Empty for the next city, still to come." />
      <TextArea label="The story" name="story" required rows={6} maxLength={6000} defaultValue={city?.story} />
      <div className="grid grid-cols-2 gap-3">
        <TextField label="Song" name="songTitle" maxLength={120} defaultValue={city?.songTitle ?? ""} />
        <TextField label="Music video address" name="videoUrl" type="url" maxLength={500} defaultValue={city?.videoUrl ?? ""} placeholder="https://" />
      </div>
      {city && <div className="relative aspect-[16/9] overflow-hidden rounded-md bg-mist"><ArtImage src={city.heroImage} alt="The cover" /></div>}
      <ImagesField label={city ? "Replace the cover" : "Cover picture"} name="hero" multiple={false} />
    </AdminForm>
  );
}
