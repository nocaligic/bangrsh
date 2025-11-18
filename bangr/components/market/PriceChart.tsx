"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import { METRIC_CONFIG, CustomTooltip, type MetricType } from "@/lib/utils/marketMetrics";
import { MOCK_TWEET_MARKETS } from "@/lib/constants/mockMarketData";

interface PriceChartProps {
  priceHistory: Array<{ time: string; [key: string]: number | string }>;
  activeMetric: MetricType;
  fastestMetric?: { metric: MetricType; delta: number };
  volumeLeader: MetricType;
}

export function PriceChart({
  priceHistory,
  activeMetric,
  fastestMetric,
  volumeLeader,
}: PriceChartProps) {
  const metricConfig = METRIC_CONFIG[activeMetric];

  // Calculate min/max for Y-axis based on active metric's actual values
  const activeMetricValues = priceHistory
    .map(point => typeof point[activeMetric] === 'number' ? point[activeMetric] as number : 0)
    .filter(val => !isNaN(val));
  
  const minValue = Math.min(...activeMetricValues);
  const maxValue = Math.max(...activeMetricValues);
  const padding = (maxValue - minValue) * 0.1 || 10;
  const yMin = Math.max(0, Math.floor(minValue - padding));
  const yMax = Math.ceil(maxValue + padding);

  return (
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
          Real-time tweet metric tracking over 24 hours.
        </p>
      </div>
      <div className="p-6">
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={priceHistory}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
            <XAxis dataKey="time" stroke="#000" />
            <YAxis stroke="#000" domain={[yMin, yMax]} />
            <Tooltip content={<CustomTooltip />} />
            {/* Only show the active metric line */}
            <Line
              type="monotone"
              dataKey={activeMetric}
              stroke={metricConfig.chartColor}
              strokeWidth={3}
              dot={false}
              name={metricConfig.label.charAt(0).toUpperCase() + metricConfig.label.slice(1)}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      {/* Leaders strip */}
      <div className="border-t-2 border-black bg-neutral-100 px-5 py-3 flex flex-wrap gap-3 text-[11px]">
        {fastestMetric && (
          <div className="inline-flex items-center gap-2 px-2 py-1 nb-border bg-white">
            <span className="font-pixel uppercase tracking-wide">Fastest Trending</span>
            <span className="font-semibold">
              {METRIC_CONFIG[fastestMetric.metric].label}
            </span>
            <span className="text-green-600 font-mono">
              +{fastestMetric.delta.toFixed(1)} pts
            </span>
          </div>
        )}
        <div className="inline-flex items-center gap-2 px-2 py-1 nb-border bg-white">
          <span className="font-pixel uppercase tracking-wide">Most Volume</span>
          <span className="font-semibold">{METRIC_CONFIG[volumeLeader].label}</span>
          <span className="font-mono text-neutral-600">
            ${MOCK_TWEET_MARKETS[volumeLeader].volume}
          </span>
        </div>
      </div>
    </div>
  );
}
