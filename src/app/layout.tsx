import type { Metadata, Viewport } from "next";
import { Caveat, Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import { StoreProvider } from "@/components/StoreProvider";
import { BRAND } from "@/lib/brand";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const playfair = Playfair_Display({ subsets: ["latin", "latin-ext"], variable: "--font-playfair" });
const caveat = Caveat({ subsets: ["latin"], weight: ["600"], variable: "--font-caveat" });

/** Lets the bottom tab bar sit above the iPhone home indicator (safe-area insets). */
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#e7e3d2" };

export const metadata: Metadata = {
  title: "Wheretonext | Your travel OS",
  description: "Curated places to eat and explore, plus flights, stays and your itinerary, all in one place.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable} ${caveat.variable}`}>
      <body className="font-sans min-h-screen">
        <StoreProvider>{children}</StoreProvider>
      </body>
    </html>
  );
}
