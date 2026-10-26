import type { Metadata, Viewport } from "next";
import { Montserrat } from "next/font/google";
import { Suspense } from "react";
import { BottomNav } from "@/components/bottom-nav";
import "./globals.css";

const montserrat = Montserrat({ variable: "--font-montserrat", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "Heart Over Money", template: "%s · Heart Over Money" },
  description: "Limited-edition art from the mission. Each purchase helps send the next outreach.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover" };

// Mobile first: one column the width of a phone, widening on tablets and centered on
// desktops, with the bottom navigation fixed under it. The nav reads the URL, which on a page
// with a slug is known only at request time, so it streams in under Suspense and a blank bar
// holds its place in the prerendered shell.
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${montserrat.variable} h-full antialiased`}>
      <body className="min-h-full bg-fog">
        <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-paper pb-[calc(4rem+env(safe-area-inset-bottom))] shadow-sm md:max-w-2xl">
          {children}
        </div>
        <Suspense fallback={<div className="fixed inset-x-0 bottom-0 h-16 border-t border-line bg-paper" />}>
          <BottomNav />
        </Suspense>
      </body>
    </html>
  );
}
