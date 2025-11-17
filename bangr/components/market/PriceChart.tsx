"use client";

interface PriceChartProps {
  data: Array<{
    timestamp: number;
    yesPrice: number;
    noPrice: number;
  }>;
}

export function PriceChart({ data }: PriceChartProps) {
  return (
    <div className="bg-white nb-border nb-shadow p-6 mb-6">
      <h2 className="text-xl font-bold mb-4">Price History</h2>
      <div className="h-64 flex items-center justify-center text-gray-400">
        Chart visualization coming soon
      </div>
    </div>
  );
}
