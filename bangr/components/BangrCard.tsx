import React from 'react';
import { ExternalLink } from 'lucide-react';

interface BangrCardProps {
  id: number;
  username: string;
  displayName: string;
  tweetText: string;
  tweetImage?: string;
  yesPrice: number;
  noPrice: number;
  volume: string;
  color: string;
  timeLeft: string;
  tag: 'HOT' | 'NEW' | string;
  trendingMetric: 'views' | 'likes' | 'retweets' | 'comments';
  targetValue: string;
}

const metricStrokeColors: Record<BangrCardProps["trendingMetric"], string> = {
  views: "#3b82f6",    // blue
  likes: "#ec4899",    // pink
  retweets: "#22c55e", // green
  comments: "#a855f7", // purple
};

const tagEmojis: Record<string, string> = {
  HOT: "🔥",
  NEW: "✨",
  TRENDING: "📈",
  CLOSING: "⏳",
  "BIG BETS": "💰",
  RESOLVED: "✅",
};

const BangrCard: React.FC<BangrCardProps> = ({
  id,
  username,
  displayName,
  tweetText,
  tweetImage = "https://placehold.co/400x250/000000/FFFFFF?text=Tweet+Image",
  yesPrice,
  noPrice,
  volume,
  color,
  timeLeft,
  tag,
  trendingMetric,
  targetValue
}) => {
  const metricColor = metricStrokeColors[trendingMetric] || "#000000";
  const tagKey = tag.toUpperCase();
  const tagEmoji = tagEmojis[tagKey] || "";

  return (
    <div className={`${color} nb-border nb-shadow flex flex-col nb-pattern-dots`}>
      {/* Card Header */}
      <header className="flex justify-between items-center p-3 border-b-2 border-black font-bold">
        <div
          className={`flex items-center gap-1 ${
            tag === "HOT" ? "bg-red-500 text-white" : "bg-white text-black"
          } px-2 py-1 text-sm border-2 border-black`}
        >
          {tag === "HOT" && (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 4a1 1 0 000 2 1 1 0 011 1v1a1 1 0 01-1 1 1 1 0 000 2 3 3 0 003 3v1a1 1 0 001 1h.5a1 1 0 001-1v-1a3 3 0 003-3 1 1 0 000-2 1 1 0 01-1-1V7a1 1 0 011-1 1 1 0 000-2H7z"
                clipRule="evenodd"
              />
            </svg>
          )}
          <span>{tag}</span>
        </div>
        <div className="bg-white px-2 py-1 text-sm border-2 border-black">
          {volume}
        </div>
        <div className="bg-white px-2 py-1 text-sm border-2 border-black">
          {timeLeft}
        </div>
      </header>

      {/* Tweet Content */}
      <div className="p-4 bg-white relative group cursor-pointer">
        {/* Hover Overlay */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center z-10">
          <div className="text-white text-2xl font-bold flex items-center gap-2">
            <span>View Market</span>
            <ExternalLink className="w-6 h-6" />
          </div>
        </div>

        {/* Tweet Author */}
        <div className="flex items-center gap-2 mb-3">
          <img
            src={`https://placehold.co/48x48/1DA1F2/FFFFFF?text=${displayName.charAt(
              0
            )}`}
            alt={displayName}
            className="w-12 h-12 nb-border"
          />
          <div>
            <div className="font-bold">{displayName}</div>
            <div className="text-sm text-neutral-600">@{username}</div>
          </div>
        </div>
        {/* Tweet Text */}
        <p className="text-sm mb-3">{tweetText}</p>
        {/* Tweet Image */}
        <img
          src={tweetImage}
          alt="Tweet"
          className="w-full h-auto nb-border mb-3"
        />
        {/* Tweet Stats */}
        <div className="flex justify-between text-sm text-neutral-600">
          <span>1.2K Comments</span>
          <span className="mx-2">3.8K Retweets</span>
          <span>8.9K Likes</span>
        </div>
      </div>

      {/* Prediction Question */}
      <div className="p-3 border-y-2 border-black font-bold text-center text-sm bg-yellow-400 text-black font-pixel nb-scanlines relative z-10">
        Will this hit {targetValue} VIEWS in 24h?
      </div>

      {/* Prediction Actions */}
      <div className="p-4">
        <div className="grid grid-cols-2 gap-3 mb-3">
          <button className="nb-button bg-green-500 text-white p-3 text-lg">
            <div>YES</div>
            <div className="text-2xl font-black">{yesPrice}¢</div>
          </button>
          <button className="nb-button bg-red-500 text-white p-3 text-lg">
            <div>NO</div>
            <div className="text-2xl font-black">{noPrice}¢</div>
          </button>
        </div>
        <div className="flex justify-between items-center text-sm font-medium">
          <span>234 traders</span>
          <span className="text-green-700 font-bold">↑ YES ahead</span>
        </div>
      </div>
    </div>
  );
};

export default BangrCard;
