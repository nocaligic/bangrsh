import type { Metadata } from "next";
import { Inter, Press_Start_2P } from "next/font/google";
import "./globals.css";
import { Providers } from "@/lib/providers";
import { PositionsProvider } from "@/contexts/PositionsContext";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const pressStart2P = Press_Start_2P({
  subsets: ["latin"],
  display: "swap",
  weight: "400",
  variable: "--font-press-start-2p",
});

export const metadata: Metadata = {
  title: "Bangr - Prediction Markets for Twitter Engagement",
  description: "Pump.fun for Tweets",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${pressStart2P.variable} text-black p-4 md:p-8`}
      >
        <Providers>
          <PositionsProvider>
            <div className="relative min-h-screen">
              <div className="pointer-events-none absolute top-0 left-0 w-1/2 h-96 bg-yellow-400 z-0 opacity-80 -rotate-12 -translate-x-1/4 translate-y-20" />
              <div className="pointer-events-none absolute bottom-0 right-0 w-1/3 h-[500px] bg-pink-500 z-0 opacity-80 rotate-6 translate-x-1/4 translate-y-1/4" />
              <div className="max-w-7xl mx-auto relative z-10">
                {children}
              </div>
            </div>
          </PositionsProvider>
        </Providers>
      </body>
    </html>
  );
}
