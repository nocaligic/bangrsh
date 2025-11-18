"use client";

import { useState, useEffect } from "react";
import { Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { useAccount, useChainId } from "wagmi";
import { useMarket } from "@/lib/hooks/useMarketData";
import { useMarkets } from "@/lib/hooks/useMarkets";
import { formatViews } from "@/lib/utils/formatting";
import { DEFAULT_CHAIN_ID } from "@/lib/constants";
import { TradeWidget } from "@/components/TradeWidget";
import { useTweetMetrics } from "@/lib/hooks/useTweetMetrics";

// Import market components
import { MarketHero } from "@/components/market/MarketHero";
import { MarketSnapshot } from "@/components/market/MarketSnapshot";
import { PriceChart } from "@/components/market/PriceChart";
import { MetricOverview } from "@/components/market/MetricOverview";
import { ActivityPanel } from "@/components/market/ActivityPanel";
import { RelatedMarkets } from "@/components/market/RelatedMarkets";

// Import mock data and utilities
import {
  generatePriceHistory,
  MOCK_TWEET_MARKETS,
  MOCK_ACTIVITY,
  MOCK_HOLDERS
} from "@/lib/constants/mockMarketData";
import { METRIC_CONFIG, type MetricType } from "@/lib/utils/marketMetrics";

export function MarketDetailClient({ marketId }: { marketId: number }) {
  const chainId = useChainId() || DEFAULT_CHAIN_ID;
  const { address } = useAccount();
  const { market, isLoading } = useMarket(marketId, chainId);
  const { markets, isLoading: isMarketsLoading } = useMarkets();

  // Determine the market's metric type from on-chain data
  const metricTypeMap: MetricType[] = ["views", "likes", "retweets", "replies"];
  const marketMetricType = metricTypeMap[Number(market?.metric ?? 0)] || "views";
  
  // Set active metric based on the market's actual metric
  const [activeMetric, setActiveMetric] = useState<MetricType>(marketMetricType);

  // Fetch live tweet metadata (text, author, avatar, metrics) from database/API
  const { data: tweetData, isLoading: isTweetDataLoading } = useTweetMetrics(market?.tweetId);

  // Generate real chart data based on actual metrics
  const generateRealChartData = () => {
    if (!market || !tweetData) return generatePriceHistory();

    const startTime = Number(market.startTime) * 1000;
    const endTime = Number(market.endTime) * 1000;
    const now = Date.now();
    const duration = endTime - startTime;
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);

    // Get initial value for the market's specific metric
    const marketMetric = metricTypeMap[Number(market.metric ?? 0)] as MetricType;
    const initialValue = Number(market.currentValue || 0);

    // Create 24 data points (one per hour)
    const dataPoints = [];
    for (let i = 0; i <= 23; i++) {
      const hourProgress = i / 23;
      const isPastHour = hourProgress <= progress;
      
      // Create point with individual metric values
      const point: any = { time: `${i}h` };
      
      (['views', 'likes', 'retweets', 'replies'] as MetricType[]).forEach(metric => {
        // Each metric uses its own actual values from tweetData
        const currentMetricValue = tweetData[metric] || 0;
        const metricIsMarketMetric = metric === marketMetric;
        
        // For the market's metric, use the initial value from contract
        // For other metrics, use their actual current values
        const startValue = metricIsMarketMetric ? initialValue : currentMetricValue * 0.9; // Estimate 10% lower for start
        
        if (isPastHour) {
          // Linear interpolation from start to current for elapsed time
          point[metric] = startValue + (currentMetricValue - startValue) * (hourProgress / progress);
        } else {
          // Future hours: flat line at current value
          point[metric] = currentMetricValue;
        }
      });
      
      dataPoints.push(point);
    }
    
    return dataPoints;
  };

  const [priceHistory, setPriceHistory] = useState(generatePriceHistory());

  // Update active metric and chart when market or tweet data loads
  useEffect(() => {
    if (market) {
      const correctMetric = metricTypeMap[Number(market.metric ?? 0)] || "views";
      setActiveMetric(correctMetric);
    }
  }, [market]);

  // Update chart with real data when tweet data loads
  useEffect(() => {
    if (market && tweetData) {
      setPriceHistory(generateRealChartData());
    }
  }, [market, tweetData]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-white">
        <Loader2 className="w-12 h-12 text-yellow-400 animate-spin mb-4" strokeWidth={3} />
        <p className="text-lg font-semibold">Loading market...</p>
      </div>
    );
  }

  if (!market) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-white">
        <div className="bg-white/10 backdrop-blur-sm nb-border p-8 text-center max-w-md">
          <h3 className="text-2xl mb-4 font-bold">Market Not Found</h3>
          <p className="text-white/80 mb-6">This market doesn't exist or hasn't been created yet.</p>
          <Link href="/">
            <button className="nb-button bg-yellow-400 text-black px-6 py-3">
              Back to Markets
            </button>
          </Link>
        </div>
      </div>
    );
  }

  // Metric configuration & helpers
  const metricConfig = METRIC_CONFIG[activeMetric];

  // Prefer live data from database/TwitterAPI.io, fall back to on-chain metadata
  const username = tweetData?.authorHandle || market.authorHandle;
  const displayName = tweetData?.authorName || market.authorHandle;
  const tweetText =
    tweetData?.text ||
    "Prediction market on this tweet's engagement over the next 24h.";
  const avatarUrl = tweetData?.avatarUrl || null;
  const tweetImage = tweetData?.imageUrl || null;
  const quotedTweet = tweetData?.quotedTweet || null;
  
  // Real tweet metrics from database
  const realMetrics = tweetData ? {
    views: tweetData.views || 0,
    likes: tweetData.likes || 0,
    retweets: tweetData.retweets || 0,
    replies: tweetData.replies || 0,
  } : null;

  // Calculate time remaining
  const endTime = Number(market.endTime) * 1000;
  const now = Date.now();
  const timeLeft = endTime - now;
  const hoursLeft = Math.floor(timeLeft / (1000 * 60 * 60));
  const minutesLeft = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
  const timeRemaining = timeLeft > 0 ? `${hoursLeft}h ${minutesLeft}m` : "Expired";

  // Determine accent color based on market ID
  const colors = ["bg-yellow-400", "bg-green-400", "bg-blue-500", "bg-pink-500", "bg-red-500", "bg-orange-500"];
  const color = colors[marketId % colors.length];

  // Extract real data from market object (not mock data)
  const currentValue = Number(market?.currentValue || 0);
  const targetValue = Number(market?.targetValue || 0);
  const formattedTarget = formatViews(targetValue);

  // Mock data still needed for some UI features (TODO: implement real data fetching)
  const activityData = MOCK_ACTIVITY[activeMetric];
  const holdersData = MOCK_HOLDERS[activeMetric];

  // Simple growth + volume leaders based on mocked data
  const metricGrowth = Object.keys(MOCK_TWEET_MARKETS).map((metricKey) => {
    const first = priceHistory[0]?.[metricKey] as number;
    const last = priceHistory[priceHistory.length - 1]?.[metricKey] as number;
    const delta = last - first;
    return { metric: metricKey as MetricType, delta };
  }).sort((a, b) => b.delta - a.delta);

  const fastestMetric = metricGrowth[0];

  const volumeLeader = Object.entries(MOCK_TWEET_MARKETS)
    .sort(([, a], [, b]) => b.volume - a.volume)[0][0] as MetricType;

  // Related markets list (simple preview of other markets)
  const relatedMarkets = (markets || [])
    .filter((m: any) => Number(m.id ?? m.index) !== marketId)
    // Show markets that trade on the same metric as the one the user is focused on
    .filter((m: any) => {
      const mMetricIndex = Number(m.metric ?? 0);
      const mMetricKey = metricTypeMap[mMetricIndex] || "views";
      return mMetricKey === activeMetric;
    })
    .slice(0, 4);

  return (
    <>
      <Header />
      <main className="max-w-6xl mx-auto space-y-6 mt-6 px-4 pb-10">
        {/* Back nav row */}
        <div className="flex items-center justify-start gap-3 mb-2">
          <Link href="/">
            <button className="nb-button bg-white text-black px-4 py-2 flex items-center gap-2 text-xs">
              <ArrowLeft className="w-4 h-4" />
              Back to markets
            </button>
          </Link>
        </div>
        {/* Hero */}
        <section className="grid gap-6 lg:grid-cols-[minmax(0,3.2fr)_minmax(0,2fr)]">
          <MarketHero
            marketId={marketId}
            username={username}
            displayName={displayName}
            tweetText={tweetText}
            avatarUrl={avatarUrl}
            tweetImage={tweetImage}
            quotedTweet={quotedTweet}
            realMetrics={realMetrics}
            formattedTarget={formattedTarget}
            currentValue={currentValue}
            timeRemaining={timeRemaining}
            activeMetric={activeMetric}
            onMetricChange={setActiveMetric}
          />

          <MarketSnapshot
            marketId={marketId}
            activeMetric={activeMetric}
            onMetricChange={setActiveMetric}
          />
        </section>

        {/* Main Content Area */}
        <section className="grid gap-5 lg:grid-cols-[minmax(0,3.2fr)_minmax(0,2fr)] items-start">
          {/* Left column: chart + stats */}
          <div className="space-y-4">
            <PriceChart
              priceHistory={priceHistory}
              activeMetric={activeMetric}
              fastestMetric={fastestMetric}
              volumeLeader={volumeLeader}
            />

            <MetricOverview
              currentValue={realMetrics?.[activeMetric] || currentValue}
              targetValue={targetValue}
              formattedTarget={formattedTarget}
              timeRemaining={timeRemaining}
              activeMetric={activeMetric}
            />

            <ActivityPanel
              activityData={activityData}
              holdersData={holdersData}
              activeMetric={activeMetric}
            />
          </div>

          {/* Right column: trade ticket + other markets (scrolls normally) */}
          <div className="space-y-4">
            <TradeWidget
              key={activeMetric}
              marketId={marketId}
              marketTitle={`Will this hit ${formattedTarget} ${activeMetric}?`}
              yesTokenId={BigInt(market?.yesTokenId || 0)}
              noTokenId={BigInt(market?.noTokenId || 0)}
              currentPrice={50}
              username={username}
              displayName={displayName}
              color={color}
            />

            <RelatedMarkets
              markets={relatedMarkets}
              currentMarketId={marketId}
              isLoading={isMarketsLoading}
              metricTypeMap={metricTypeMap}
            />
          </div>
        </section>
      </main>
    </>
  );
}
