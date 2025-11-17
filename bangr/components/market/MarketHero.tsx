"use client";

import { ExternalLink } from "lucide-react";

interface MarketHeroProps {
  tweetUrl: string;
  authorHandle: string;
}

export function MarketHero({ tweetUrl, authorHandle }: MarketHeroProps) {
  return (
    <div className="bg-white nb-border nb-shadow p-6 mb-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-black mb-2">
            Will @{authorHandle}'s tweet hit the target?
          </h1>
          <p className="text-gray-600 mb-4">
            Predict the engagement metrics for this tweet
          </p>
        </div>
        <a
          href={tweetUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="nb-button bg-blue-500 text-white px-4 py-2 flex items-center gap-2"
        >
          View Tweet <ExternalLink className="w-4 h-4" />
        </a>
      </div>
    </div>
  );
}
