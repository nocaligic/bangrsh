"use client";

import { Clock, TrendingUp } from "lucide-react";
import { METRIC_CONFIG, type MetricType } from "@/lib/utils/marketMetrics";
import { formatViews } from "@/lib/utils/formatting";

interface MarketHeroProps {
  marketId: number;
  username: string;
  displayName: string;
  tweetText: string;
  avatarUrl?: string | null;
  tweetImage?: string | null;
  quotedTweet?: {
    tweetId: string;
    text: string;
    authorHandle: string;
    authorName: string;
    avatarUrl?: string | null;
  } | null;
  realMetrics?: {
    views: number;
    likes: number;
    retweets: number;
    replies: number;
  } | null;
  formattedTarget: string;
  currentValue: number;
  timeRemaining: string;
  activeMetric: MetricType;
  onMetricChange: (metric: MetricType) => void;
}

export function MarketHero({
  marketId,
  username,
  displayName,
  tweetText,
  avatarUrl,
  tweetImage,
  quotedTweet,
  realMetrics,
  formattedTarget,
  currentValue,
  timeRemaining,
  activeMetric,
  onMetricChange,
}: MarketHeroProps) {
  const metricConfig = METRIC_CONFIG[activeMetric];

  return (
    <div className="bg-yellow-200 nb-pattern-dots nb-border nb-shadow relative overflow-hidden">
      <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-yellow-300/60 blur-2xl pointer-events-none" />
      <div className="p-6 relative z-10">
        <div className="flex items-center justify-between mb-4">
          <span className="inline-flex items-center gap-2 px-3 py-1 bg-black text-yellow-300 font-pixel text-[10px] uppercase tracking-[0.2em] nb-border">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            Twitter Market · 24h Window
          </span>
          <span className="hidden md:inline-flex px-3 py-1 bg-white/80 nb-border text-[11px] font-mono">
            #{marketId.toString().padStart(3, "0")}
          </span>
        </div>

        {/* Tweet content in white box */}
        <div className="bg-white nb-border p-4 mb-4">
          <div className="flex items-start gap-3 mb-3">
            <div className="w-12 h-12 rounded-full bg-neutral-200 nb-border overflow-hidden flex items-center justify-center text-xl font-bold flex-shrink-0">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarUrl}
                  alt={displayName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span>{username[0]?.toUpperCase() || "?"}</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="text-black font-bold text-base">{displayName}</span>
                <span className="text-neutral-600 text-sm">@{username}</span>
              </div>
              <p className="text-black text-sm leading-relaxed whitespace-pre-wrap break-words">{tweetText}</p>
            </div>
          </div>

          {/* Tweet image if exists */}
          {tweetImage && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={tweetImage}
              alt="Tweet media"
              className="w-full nb-border rounded"
            />
          )}

          {/* Quoted Tweet */}
          {quotedTweet && (
            <div className="mt-3 p-4 bg-gray-50 nb-border rounded">
              <div className="flex items-start gap-2 mb-2">
                {quotedTweet.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={quotedTweet.avatarUrl}
                    alt={quotedTweet.authorName}
                    className="w-8 h-8 rounded-full border border-black flex-shrink-0 object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 border border-black flex-shrink-0 flex items-center justify-center">
                    <span className="text-white font-semibold text-xs">
                      {quotedTweet.authorHandle.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm">{quotedTweet.authorName}</div>
                  <div className="text-xs text-gray-600">@{quotedTweet.authorHandle}</div>
                </div>
              </div>
              <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap break-words">
                {quotedTweet.text}
              </p>
            </div>
          )}
        </div>

        <h1 className="text-xl md:text-2xl font-bold text-black mb-4 font-pixel leading-snug">
          Will this hit{" "}
          <span className="text-white text-shadow-black inline-block">
            {formattedTarget}
          </span>{" "}
          <span className={`${metricConfig.textColor} font-pixel`}>
            {metricConfig.label.toUpperCase()}
          </span>{" "}
          in 24h?
        </h1>

        {/* Metric summary pills */}
        <div className="mt-4 grid grid-cols-2 gap-3 text-xs md:text-sm">
          <div className="nb-border bg-yellow-100 px-3 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span className="font-bold uppercase tracking-wide">Time Left</span>
            </div>
            <span className="font-bold">{timeRemaining}</span>
          </div>
          <div className="nb-border bg-neutral-100 px-3 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              <span className="font-bold uppercase tracking-wide">Target</span>
            </div>
            <span className="font-bold">{formattedTarget}</span>
          </div>
          <div className="nb-border bg-neutral-100 px-3 py-2 flex items-center justify-between">
            <span className="font-bold uppercase tracking-wide">Current {metricConfig.label}</span>
            <span className="font-bold">{formatViews(currentValue)}</span>
          </div>
          <div className="nb-border bg-neutral-100 px-3 py-2 flex items-center justify-between">
            <span className="font-bold uppercase tracking-wide">Volume</span>
            <span className="font-bold">$0</span>
          </div>
        </div>
      </div>

      {/* Metric tabs */}
      <div className="border-t-2 border-black bg-neutral-900 text-white">
        <div className="flex">
          {Object.entries(METRIC_CONFIG).map(([metric, config]) => {
            const isActive = activeMetric === metric;
            const Icon = config.icon;
            return (
              <button
                key={metric}
                onClick={() => onMetricChange(metric as MetricType)}
                className={`flex-1 flex flex-col items-center justify-center gap-1 py-3 text-xs md:text-sm font-bold border-r-2 border-black transition-all ${
                  isActive ? "text-black" : "bg-neutral-900 text-white hover:bg-neutral-800"
                }`}
                style={isActive ? { backgroundColor: config.chartColor } : undefined}
              >
                <Icon className="w-4 h-4" />
                <span className="uppercase tracking-wide">{config.label}</span>
              </button>
            );
          })}
        </div>
        <div className="bg-yellow-400 nb-scanlines border-t-2 border-black px-4 py-3 text-center">
          <p className="font-pixel text-[11px] md:text-xs text-black">
            You&apos;re trading on{" "}
            <span className="text-white text-shadow-black font-normal">
              {activeMetric.toUpperCase()}
            </span>{" "}
            hitting{" "}
            <span className="text-white text-shadow-black font-normal">
              {formattedTarget}
            </span>{" "}
            in 24h.
          </p>
        </div>
      </div>
    </div>
  );
}
