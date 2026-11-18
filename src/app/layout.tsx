import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";
import { StoreProvider } from "@/components/StoreProvider";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Travel Bug",
  description: "Plan trips: flights, stays, things to do and a day-by-day itinerary.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans min-h-screen">
        <StoreProvider>
          <Sidebar />
          <main className="pl-[64px] md:pl-[84px]">
            <div className="px-5 md:px-12 py-8 md:py-10 max-w-[1800px]">{children}</div>
          </main>
        </StoreProvider>
      </body>
    </html>
  );
}
