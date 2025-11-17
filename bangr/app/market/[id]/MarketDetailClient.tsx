"use client";

import { useState, useEffect } from "react";
import { MessageCircle, Repeat2, Heart, Eye, TrendingUp, Clock, Loader2, ArrowLeft, Sparkles } from "lucide-react";
import Link from "next/link";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import { TradingModal } from "@/components/TradingModal";
import { Header } from "@/components/Header";
import { useAccount, useChainId } from "wagmi";
import { useMarket } from "@/lib/hooks/useMarketData";
import { useMarkets } from "@/lib/hooks/useMarkets";
import { formatViews, formatNumber } from "@/lib/utils/formatting";
import { DEFAULT_CHAIN_ID } from "@/lib/constants";
import { TradeWidget } from "@/components/TradeWidget"; // Import the new widget

// Generate FAKE multi-metric price history data
function generatePriceHistory() {
  const data = [];
  const metrics = {
    views: 50,
    likes: 30,
    retweets: 20,
    replies: 10,
  };

  for (let i = 0; i < 24; i++) {
    const entry: { time: string; [key: string]: number | string } = { time: `${i}h` };
    for (const metric in metrics) {
      // Simulate some random fluctuation
      let price = metrics[metric as keyof typeof metrics];
      price += (Math.random() - 0.5) * 5;
      price = Math.max(5, Math.min(95, price));
      metrics[metric as keyof typeof metrics] = price;
      entry[metric] = price;
    }
    data.push(entry);
  }
  return data;
}

// Fake top holders data (placeholder until we track holder data)
const fakeHolders = {
  yes: [
    { name: "CryptoWhale", shares: 18692, avatar: "🐋" },
    { name: "DiamondHands", shares: 16478, avatar: "💎" },
    { name: "MoonBoy", shares: 13907, avatar: "🌙" },
    { name: "HODLer", shares: 12166, avatar: "🚀" },
    { name: "BullMarket", shares: 9431, avatar: "🐂" },
  ],
  no: [
    { name: "BearWhale", shares: 79213, avatar: "🐻" },
    { name: "Skeptic", shares: 20156, avatar: "🤔" },
    { name: "Realist", shares: 10064, avatar: "📊" },
    { name: "Contrarian", shares: 7524, avatar: "🎯" },
    { name: "Doubter", shares: 6683, avatar: "❓" },
  ],
};

// formatViews and formatNumber moved to @/lib/utils/formatting

// MOCK DATA STRUCTURE FOR MULTIPLE MARKETS
const MOCK_TWEET_MARKETS = {
  views: { id: 1, yesTokenId: 2, noTokenId: 3, targetValue: 50000000, currentValue: 2500000, volume: 10 },
  likes: { id: 2, yesTokenId: 4, noTokenId: 5, targetValue: 10000, currentValue: 8500, volume: 25 },
  retweets: { id: 3, yesTokenId: 6, noTokenId: 7, targetValue: 5000, currentValue: 4200, volume: 15 },
  replies: { id: 4, yesTokenId: 8, noTokenId: 9, targetValue: 1000, currentValue: 950, volume: 5 },
};

const MOCK_ACTIVITY = {
  views: [{ user: '0x123...', action: 'Bought 10 YES' }, { user: '0x456...', action: 'Sold 5 NO' }],
  likes: [{ user: '0x789...', action: 'Bought 20 YES' }],
  retweets: [{ user: '0xabc...', action: 'Bought 10 YES' }],
  replies: [{ user: '0xdef...', action: 'Sold 5 NO' }],
};
const MOCK_HOLDERS = {
  views: [{ user: '0xabc...', shares: 100 }, { user: '0xdef...', shares: 50 }],
  likes: [{ user: '0xghi...', shares: 200 }],
  retweets: [{ user: '0xjkl...', shares: 150 }],
  replies: [{ user: '0xmnop...', shares: 100 }],
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white nb-border p-3">
        <p className="font-bold mb-2">{`Time: ${label}`}</p>
        {payload.map((entry: any) => (
          <p key={entry.name} style={{ color: entry.color }}>
            {`${entry.name}: ${formatViews(entry.value * 1000000)}`}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export function MarketDetailClient({ marketId }: { marketId: number }) {
  const chainId = useChainId() || DEFAULT_CHAIN_ID;
  const { address } = useAccount();
  const { market, isLoading } = useMarket(marketId, chainId);
  const { markets, isLoading: isMarketsLoading } = useMarkets();

  const [priceHistory, setPriceHistory] = useState(generatePriceHistory());
  const [activeChartTab, setActiveChartTab] =
    useState<"chart" | "holders" | "activity">("chart");
  const [activeMetric, setActiveMetric] = useState<MetricType>("views");
  const [tradingModalOpen, setTradingModalOpen] = useState(false);
  const [selectedOutcome, setSelectedOutcome] = useState<"YES" | "NO">("YES");
  const [detailTab, setDetailTab] = useState<"flow" | "holders">("flow");

  useEffect(() => {
    if (market) {
      setPriceHistory(generatePriceHistory());
    }
  }, [market]);

  const handleTradeClick = (outcome: "YES" | "NO") => {
    setSelectedOutcome(outcome);
    setTradingModalOpen(true);
  };

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
  type MetricType = 'views' | 'likes' | 'retweets' | 'replies';
  const METRIC_CONFIG: Record<
    MetricType,
    { emoji: string; label: string; chartColor: string; textColor: string; icon: any }
  > = {
    views: {
      emoji: '👁️',
      label: 'views',
      chartColor: '#3b82f6', // blue-500
      textColor: 'text-blue-500',
      icon: Eye,
    },
    likes: {
      emoji: '❤️',
      label: 'likes',
      chartColor: '#ec4899', // pink-500
      textColor: 'text-pink-500',
      icon: Heart,
    },
    retweets: {
      emoji: '🔄',
      label: 'retweets',
      chartColor: '#22c55e', // green-500
      textColor: 'text-green-500',
      icon: Repeat2,
    },
    replies: {
      emoji: '💬',
      label: 'replies',
      chartColor: '#a855f7', // purple-500
      textColor: 'text-purple-500',
      icon: MessageCircle,
    },
  };
  const metricTypeMap: MetricType[] = ["views", "likes", "retweets", "replies"];
  const metricConfig = METRIC_CONFIG[activeMetric];
  const username = market.authorHandle;
  const displayName = market.authorHandle;

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
          {/* Tweet + question */}
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

              <div className="flex items-start gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-white nb-border flex items-center justify-center text-xl font-bold">
                  {username[0]?.toUpperCase() || "?"}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-black font-bold text-lg">{displayName}</span>
                    <span className="text-neutral-600">@{username}</span>
                  </div>
                  <p className="text-black/80 text-sm">
                    Prediction market on this tweet&apos;s engagement over the next 24h.
                  </p>
                </div>
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
                  <span className="font-bold">
                    {formatViews(currentValue)}
                  </span>
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
                      onClick={() => setActiveMetric(metric as MetricType)}
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

          {/* Right side: quick market snapshot */}
          <div className="space-y-4">
            <div className="bg-gradient-to-br from-yellow-300 to-orange-400 nb-border nb-shadow p-4 flex flex-col gap-3 text-black">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5" />
                  <div className="leading-tight">
                    <p className="font-pixel text-xs uppercase">Bangr Odds</p>
                    <p className="text-xs text-black/80">
                      Snapshot of where traders are leaning right now.
                    </p>
                  </div>
                </div>
                <span className="px-2 py-1 nb-border bg-black/10 text-[10px] font-mono uppercase">
                  Demo Pricing
                </span>
              </div>
              <div className="flex items-center justify-between gap-4 text-center">
                <div className="flex-1 nb-border bg-white/70 py-2">
                  <p className="text-[11px] font-semibold text-black/70">YES</p>
                  <p className="font-pixel text-2xl leading-none">52%</p>
                </div>
                <div className="w-6 h-6 rounded-full border-2 border-black flex items-center justify-center text-[10px] font-pixel bg-yellow-200">
                  VS
                </div>
                <div className="flex-1 nb-border bg-white/70 py-2">
                  <p className="text-[11px] font-semibold text-black/70">NO</p>
                  <p className="font-pixel text-2xl leading-none">48%</p>
                </div>
              </div>
              <div className="h-2 nb-border bg-black/10 overflow-hidden">
                <div className="h-full w-[52%] bg-green-400 float-left" />
                <div className="h-full w-[48%] bg-red-400 float-right" />
              </div>
            </div>

            <div className="bg-white nb-pattern-dots nb-border nb-shadow p-4 space-y-3">
              <h3 className="text-sm flex items-center justify-between">
                <span className="font-pixel text-[11px] uppercase tracking-wide">
                  Market Snapshot
                </span>
                <span className="text-xs font-pixel bg-yellow-300 px-2 py-1 nb-border">
                  #{marketId}
                </span>
              </h3>
              <div className="grid grid-cols-2 gap-3 text-xs">
                {Object.entries(MOCK_TWEET_MARKETS).map(([metric, data]) => {
                  const cfg = METRIC_CONFIG[metric as MetricType];
                  const Icon = cfg.icon;
                  const isActive = activeMetric === metric;
                  return (
                    <button
                      key={metric}
                      onClick={() => setActiveMetric(metric as MetricType)}
                      className={`text-left px-3 py-2 nb-border flex flex-col gap-1 transition-all ${
                        isActive ? "bg-white" : "bg-neutral-50 hover:bg-neutral-100"
                      }`}
                      style={isActive ? { borderColor: cfg.chartColor } : undefined}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-bold flex items-center gap-1">
                          <Icon className="w-3 h-3" /> {cfg.label}
                        </span>
                        <span className="text-[10px] font-semibold text-neutral-500">
                          Vol ${data.volume}
                        </span>
                      </div>
                      <div className="flex items-baseline justify-between">
                        <span className="font-bold text-xs">
                          {formatViews(data.currentValue)} / {formatViews(data.targetValue)}
                        </span>
                        <span className="text-[10px] text-neutral-600">
                          {Math.round((data.currentValue / data.targetValue) * 100)}% to goal
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* Main Content Area */}
        <section className="grid gap-5 lg:grid-cols-[minmax(0,3.2fr)_minmax(0,2fr)] items-start">
          {/* Left column: chart + stats */}
          <div className="space-y-4">
            {/* Chart */}
            <div className="bg-white nb-border nb-shadow">
              <div className="flex items-center justify-between px-5 py-2 border-b-2 border-black bg-neutral-900 text-white">
                <div className="flex items-center gap-2 text-xs uppercase tracking-wide">
                  <span className="font-pixel">Engagement tape</span>
                  <span
                    className="px-2 py-0.5 nb-border text-black"
                    style={{ backgroundColor: metricConfig.chartColor }}
                  >
                    {metricConfig.label.toUpperCase()}
                  </span>
                </div>
                <p className="text-[11px] text-neutral-300">
                  Simulated hourly odds for each tweet metric (design preview).
                </p>
              </div>
              <div className="p-6">
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={priceHistory}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                    <XAxis dataKey="time" stroke="#000" />
                    <YAxis stroke="#000" domain={[0, 100]} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend verticalAlign="top" height={24} wrapperStyle={{ fontSize: 11 }} />
                    {Object.keys(MOCK_TWEET_MARKETS).map((metric) => {
                      const isActive = activeMetric === metric;
                      const color = METRIC_CONFIG[metric as MetricType].chartColor;
                      return (
                        <Line
                          key={metric}
                          type="monotone"
                          dataKey={metric}
                          stroke={color}
                          strokeWidth={isActive ? 3 : 1.5}
                          strokeOpacity={isActive ? 1 : 0.4}
                          dot={false}
                          name={metric.charAt(0).toUpperCase() + metric.slice(1)}
                        />
                      );
                    })}
                  </LineChart>
                </ResponsiveContainer>
              </div>
              {/* Leaders strip */}
              <div className="border-t-2 border-black bg-neutral-100 px-5 py-3 flex flex-wrap gap-3 text-[11px]">
                {fastestMetric && (
                  <div
                    className="inline-flex items-center gap-2 px-2 py-1 nb-border bg-white"
                  >
                    <span className="font-pixel uppercase tracking-wide">
                      Fastest Trending
                    </span>
                    <span className="font-semibold">
                      {METRIC_CONFIG[fastestMetric.metric].label}
                    </span>
                    <span className="text-green-600 font-mono">
                      +{fastestMetric.delta.toFixed(1)} pts
                    </span>
                  </div>
                )}
                <div
                  className="inline-flex items-center gap-2 px-2 py-1 nb-border bg-white"
                >
                  <span className="font-pixel uppercase tracking-wide">
                    Most Volume
                  </span>
                  <span className="font-semibold">
                    {METRIC_CONFIG[volumeLeader].label}
                  </span>
                  <span className="font-mono text-neutral-600">
                    ${MOCK_TWEET_MARKETS[volumeLeader].volume}
                  </span>
                </div>
              </div>
            </div>

            {/* Market info */}
            <div className="space-y-4">
              {/* Tweet metric overview (per tweet metric) */}
              <div className="bg-white nb-border nb-shadow">
                {/* Header bar */}
                <div
                  className="flex items-center justify-between px-4 py-2 border-b-2 border-black"
                  style={{ backgroundColor: metricConfig.chartColor, color: "#000" }}
                >
                  <div className="flex items-center gap-2 text-xs font-bold">
                    <span className="font-pixel uppercase tracking-wide">
                      Tweet metric overview
                    </span>
                  </div>
                  <span className="px-2 py-1 nb-border bg-white/80 text-[10px] uppercase tracking-wide flex items-center gap-1">
                    {metricConfig.emoji} {metricConfig.label.toUpperCase()}
                  </span>
                </div>
                {/* Body */}
                <div className="p-4">
                  <dl className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <dt className="text-neutral-600">Current {metricConfig.label}</dt>
                      <dd className="font-bold">{formatViews(currentValue)}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-neutral-600">Target {metricConfig.label}</dt>
                      <dd className="font-bold">{formattedTarget}</dd>
                    </div>
                    <div className="flex justify-between items-center">
                      <dt className="text-neutral-600">Progress to target</dt>
                      <dd className="font-bold">
                        {Math.round((currentValue / targetValue) * 100)}%
                      </dd>
                    </div>
                    <div className="h-2 nb-border bg-neutral-100 overflow-hidden">
                      <div
                        className="h-full"
                        style={{
                          width: `${Math.min(
                            100,
                            (currentValue / targetValue) * 100
                          )}%`,
                          backgroundColor: metricConfig.chartColor,
                        }}
                      />
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-neutral-600">Market Volume (all orders)</dt>
                      <dd className="font-bold">$0</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-neutral-600">Time Left</dt>
                      <dd className="font-bold">{timeRemaining}</dd>
                    </div>
                  </dl>
                </div>
              </div>

              {/* Activity & holders */}
              <div className="bg-white nb-border nb-shadow">
                {/* Header bar */}
                <div className="flex items-center justify-between px-4 py-2 border-b-2 border-black bg-neutral-900 text-white">
                  <span className="text-xs font-pixel uppercase tracking-wide">
                    Activity &amp; holders
                  </span>
                  <span className="text-[10px] font-mono text-neutral-300">
                    {metricConfig.label.toUpperCase()}
                  </span>
                </div>

                <div className="p-4">
                  {/* Tabs like Polymarket: Activity / Top holders */}
                  <div className="inline-flex gap-2 mb-3 text-[11px] font-semibold uppercase tracking-wide">
                    <button
                      onClick={() => setDetailTab("flow")}
                      className={`nb-button px-4 py-2 ${
                        detailTab === "flow"
                          ? "bg-yellow-400 text-black"
                          : "bg-white text-black"
                      }`}
                    >
                      Activity
                    </button>
                    <button
                      onClick={() => setDetailTab("holders")}
                      className={`nb-button px-4 py-2 ${
                        detailTab === "holders"
                          ? "bg-yellow-400 text-black"
                          : "bg-white text-black"
                      }`}
                    >
                      Top holders
                    </button>
                  </div>

                  <div className="space-y-3 text-xs">
                    {detailTab === "flow" && (
                      <div>
                        <h4 className="font-semibold mb-1">Recent orders</h4>
                        <div className="space-y-1">
                          {activityData.map((item, index) => (
                            <div
                              key={index}
                              className="flex justify-between border-b border-dashed border-neutral-200 py-1 last:border-b-0"
                            >
                              <span className="font-mono text-[11px]">{item.user}</span>
                              <span className="font-semibold">{item.action}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {detailTab === "holders" && (
                      <div>
                        <h4 className="font-semibold mb-1">Largest positions</h4>
                        <div className="space-y-1">
                          {holdersData.map((item, index) => (
                            <div
                              key={index}
                              className="flex justify-between border-b border-dashed border-neutral-200 py-1 last:border-b-0"
                            >
                              <span className="font-mono text-[11px]">{item.user}</span>
                              <span className="font-semibold">
                                {item.shares}{" "}
                                <span className="text-neutral-500">shares</span>
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
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

            <div className="bg-white nb-pattern-dots nb-border nb-shadow p-4 space-y-3">
              <h3 className="text-sm font-bold flex items-center justify-between">
                <span>Other Twitter markets</span>
                <span className="text-[10px] font-mono text-neutral-500">
                  {isMarketsLoading ? "Loading..." : `${relatedMarkets.length} shown`}
                </span>
              </h3>
              <div className="space-y-2 text-xs">
                {relatedMarkets.length === 0 && !isMarketsLoading && (
                  <p className="text-neutral-500 text-[11px]">
                    No other markets yet – create one from the home page.
                  </p>
                )}
                {relatedMarkets.map((m: any, index: number) => {
                  const id = Number(m.id ?? m.index);
                  const metricIndex = Number(m.metric ?? 0);
                  const metricKey = metricTypeMap[metricIndex] || "views";
                  const cfg = METRIC_CONFIG[metricKey];
                  const author = m.authorHandle || "unknown";
                  const target = formatViews(Number(m.targetValue ?? 0));
                  return (
                    <Link
                      key={`${id}-${index}`}
                      href={`/market/${id}`}
                      className="block nb-border bg-white hover:bg-yellow-50 transition p-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex-1">
                          <p className="text-[11px] font-semibold truncate">
                            @{author}
                          </p>
                          <p className="text-[11px] text-neutral-600 truncate">
                            Will this hit <span className="font-bold">{target}</span>{" "}
                            {cfg.label}?
                          </p>
                        </div>
                        <span
                          className="px-2 py-1 text-[10px] font-bold uppercase nb-border"
                          style={{ backgroundColor: cfg.chartColor, color: "#000" }}
                        >
                          {cfg.label}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
