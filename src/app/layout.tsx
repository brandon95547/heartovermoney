import type { Metadata, Viewport } from "next";
import { Montserrat } from "next/font/google";
import { cookies } from "next/headers";
import { Suspense } from "react";
import { BottomNav } from "@/components/bottom-nav";
import { NoZoom } from "@/components/no-zoom";
import { getNextEvent } from "@/lib/queries";
import { SECTION_COOKIE } from "@/lib/sections";
import "./globals.css";

const montserrat = Montserrat({ variable: "--font-montserrat", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "Heart Over Money", template: "%s · Heart Over Money" },
  description: "Limited-edition art from the mission. Each purchase helps send the next outreach.",
};

// No pinch zoom (the client, October 2026): see components/no-zoom.tsx.
export const viewport: Viewport = { width: "device-width", initialScale: 1, maximumScale: 1, userScalable: false, viewportFit: "cover" };

// Mobile first: one column the width of a phone, widening on tablets and centered on
// desktops, with the bottom navigation fixed under it. The nav reads the URL, which on a page
// with a slug is known only at request time, so it streams in under Suspense and a blank bar
// holds its place in the prerendered shell. It reads the section the visitor was last in, for
// pages shared by Products and Posts.
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${montserrat.variable} h-full antialiased`}>
      <body className="min-h-full bg-fog">
        <NoZoom />
        {/* Phones and tablets only for now (the client, October 2026): a column a phone wide, a
            tablet wide from 768px, and never wider, centered on a larger screen. Whatever is
            fixed to the screen (the bottom icons, the card process, the photo wall, the message
            box, the menu) keeps to the same column. */}
        <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-paper pb-[calc(4rem+env(safe-area-inset-bottom))] shadow-sm md:max-w-2xl">
          {children}
        </div>
        <Suspense fallback={<div className="fixed inset-x-0 bottom-0 mx-auto h-16 max-w-md border-t border-line bg-paper md:max-w-2xl" />}>
          <Nav />
        </Suspense>
      </body>
    </html>
  );
}

// Posts' homepage is the current event's Overview; with no event yet, /events says so.
async function Nav() {
  const [jar, event] = await Promise.all([cookies(), getNextEvent()]);
  const last = jar.get(SECTION_COOKIE)?.value === "posts" ? "posts" : "products";
  return <BottomNav lastSection={last} postsHome={event ? `/events/${event.slug}` : "/events"} />;
}
