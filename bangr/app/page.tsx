"use client";

import { useState } from "react";
import { CreateMarketModal } from "@/components/CreateMarketModal";
import { Header } from "@/components/Header";
import { useMarkets } from "@/lib/hooks/useMarkets";
import BangrCard from "@/components/BangrCard"; // Assuming BangrCard is default export
import MarqueeTicker from "@/components/MarqueeTicker";
import { Loader2 } from "lucide-react";
import Link from "next/link";


export default function Home() {
  const [createModalOpen, setCreateModalOpen] = useState(false);

  // Fetch real markets from blockchain
  const { markets, isLoading: marketsLoading } = useMarkets();

  return (
    <div className="relative min-h-screen px-4 md:px-6 lg:px-8">
      {/* Background decoration shapes */}
      <div className="absolute top-10 left-10 w-64 h-64 bg-yellow-400 nb-border nb-shadow rotate-12 -z-10 opacity-50" />
      <div className="absolute bottom-20 right-20 w-80 h-80 bg-pink-500 nb-border nb-shadow -rotate-12 -z-10 opacity-40" />

      <div className="sticky top-0 z-30 bg-[#2A0A4A] pt-4 pb-4">
        <Header onCreateClick={() => setCreateModalOpen(true)} />

        <nav className="mb-6 bg-green-400 nb-border nb-shadow p-4 mt-4">
          <div className="flex flex-wrap gap-2">
            <button className="nb-button bg-white text-black px-4 py-2 text-sm">
              🔥 Trending
            </button>
            <button className="nb-button bg-red-500 text-white px-4 py-2 text-sm">
              HOT
            </button>
            <button className="nb-button bg-white text-black px-4 py-2 text-sm">
              New
            </button>
            <button className="nb-button bg-white text-black px-4 py-2 text-sm">
              Closing
            </button>
            <button className="nb-button bg-white text-black px-4 py-2 text-sm">
              Big Bets
            </button>
            <button className="nb-button bg-neutral-200 text-neutral-600 px-4 py-2 text-sm">
              Resolved
            </button>
          </div>
        </nav>
      </div>

      <MarqueeTicker />

      <main className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mt-6 pb-12">
        {marketsLoading ? (
          <div className="col-span-full flex flex-col items-center justify-center py-20">
            <Loader2 className="w-12 h-12 text-yellow-400 animate-spin mb-4" strokeWidth={3} />
            <p className="text-white text-lg font-semibold">Loading markets...</p>
          </div>
        ) : markets.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center py-20">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl border-4 border-white/20 p-8 text-center max-w-md">
               <h3 className="text-white text-2xl mb-4 font-bold">No markets yet!</h3>
              <p className="text-white/80 mb-6">Be the first to create a prediction market on tweet engagement.</p>
              <button
                onClick={() => setCreateModalOpen(true)}
                 className="nb-button bg-yellow-400 text-black px-6 py-3"
              >
                Create First Market 🚀
              </button>
            </div>
          </div>
        ) : (
          markets.map((market: any, index: number) => {
            const colors = ["bg-yellow-400", "bg-green-400", "bg-blue-500", "bg-red-500"];
            const color = colors[index % colors.length];

            // This is a placeholder for mapping. I need to see what `market` object contains.
            // For now, I'll pass some values.
              return (
                <Link href={`/market/${market.id || market.index}`} key={market.id?.toString() || market.index} className="mb-6 break-inside-avoid block">
                <BangrCard
                  id={Number(market.id || market.index)}
                  username={market.authorHandle || "unknown"}
                  displayName={market.authorHandle || "Unknown"}
                  tweetText={`Prediction market for @${market.authorHandle || 'unknown'}'s tweet`}
                  yesPrice={50}
                  noPrice={50}
                  volume="$10"
                  color={color}
                  timeLeft="16h left"
                  tag={index % 2 === 0 ? "HOT" : "NEW"}
                  trendingMetric="views"
                  targetValue="52.0M"
                />
              </Link>
              );
          })
        )}
      </main>

      <CreateMarketModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
      />
    </div>
  );
}
