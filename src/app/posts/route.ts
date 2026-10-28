// /posts: Posts has no page of its own. Its homepage is the current event's Overview (screen
// design page 10), whose photos are the posts (the client, October 2026). Old links land there.
import { getNextEvent } from "@/lib/queries";

export async function GET() {
  const event = await getNextEvent();
  return new Response(null, { status: 307, headers: { Location: event ? `/events/${event.slug}` : "/events" } });
}
