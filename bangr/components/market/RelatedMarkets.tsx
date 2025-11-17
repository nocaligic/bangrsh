"use client";

import Link from "next/link";
import BangrCard from "../BangrCard";

interface RelatedMarketsProps {
  markets: any[];
  currentMarketId: number;
}

export function RelatedMarkets({ markets, currentMarketId }: RelatedMarketsProps) {
  const relatedMarkets = markets
    .filter((m) => Number(m.id || m.index) !== currentMarketId)
    .slice(0, 3);

  if (relatedMarkets.length === 0) {
    return null;
  }

  return (
    <div className="mt-8">
      <h2 className="text-2xl font-black mb-4">Related Markets</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {relatedMarkets.map((market, index) => {
          const colors = ["bg-yellow-400", "bg-green-400", "bg-blue-500"];
          return (
            <Link
              key={market.id || market.index}
              href={`/market/${market.id || market.index}`}
            >
              <BangrCard
                id={Number(market.id || market.index)}
                username={market.authorHandle || "unknown"}
                displayName={market.authorHandle || "Unknown"}
                tweetText={`Prediction market for @${market.authorHandle || 'unknown'}'s tweet`}
                yesPrice={50}
                noPrice={50}
                volume="$10"
                color={colors[index % colors.length]}
                timeLeft="16h left"
                tag="NEW"
                trendingMetric="views"
                targetValue="52.0M"
              />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
