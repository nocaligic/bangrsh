'use client';

import { useTweetMetrics } from '@/lib/hooks/useTweetMetrics';
import { mapMetricEnumToString, formatMetricValue, calculateTimeLeft } from '@/lib/utils/marketHelpers';
import BangrCard from '@/components/BangrCard';
import { Loader2 } from 'lucide-react';

interface Market {
  id: number;
  tweetId: string;
  tweetUrl: string;
  authorHandle: string;
  metric: number;
  targetValue: bigint;
  endTime: bigint;
  [key: string]: any;
}

interface MarketCardWithDataProps {
  market: Market;
  index: number;
  color: string;
}

export function MarketCardWithData({ market, index, color }: MarketCardWithDataProps) {
  const { data: tweetData, isLoading, error } = useTweetMetrics(market.tweetId);

  if (isLoading) {
    return (
      <div className={`${color} nb-border nb-shadow flex items-center justify-center p-8`}>
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  // If we have tweet data (even if there's an error message in it), use it
  // Only fall back if data is completely missing
  if (!tweetData || (!tweetData.text && !tweetData.authorHandle)) {
    // Fallback to basic display without tweet data
    return (
      <BangrCard
        id={Number(market.id || market.index)}
        username={market.authorHandle || 'unknown'}
        displayName={market.authorHandle || 'Unknown'}
        tweetText={`Prediction market for @${market.authorHandle || 'unknown'}'s tweet`}
        yesPrice={50}
        noPrice={50}
        volume="$10"
        color={color}
        timeLeft={calculateTimeLeft(market.endTime)}
        tag={index % 2 === 0 ? "HOT" : "NEW"}
        trendingMetric={mapMetricEnumToString(Number(market.metric))}
        targetValue={formatMetricValue(market.targetValue)}
      />
    );
  }

  // Use real tweet data (or rate-limited fallback data)
  return (
    <BangrCard
      id={Number(market.id || market.index)}
      username={tweetData.authorHandle}
      displayName={tweetData.authorName}
      tweetText={tweetData.text}
      tweetImage={tweetData.imageUrl}
      profileImage={tweetData.avatarUrl}
      quotedTweet={tweetData.quotedTweet || null}
      tweetMetrics={{
        views: tweetData.views,
        likes: tweetData.likes,
        retweets: tweetData.retweets,
        replies: tweetData.replies,
      }}
      yesPrice={50}
      noPrice={50}
      volume="$10"
      color={color}
      timeLeft={calculateTimeLeft(market.endTime)}
      tag={index % 2 === 0 ? "HOT" : "NEW"}
      trendingMetric={mapMetricEnumToString(Number(market.metric))}
      targetValue={formatMetricValue(market.targetValue)}
    />
  );
}
