"use client";

interface MarketSnapshotProps {
  metric: string;
  targetValue: string;
  endTime: number;
  totalVolume: string;
}

export function MarketSnapshot({
  metric,
  targetValue,
  endTime,
  totalVolume,
}: MarketSnapshotProps) {
  const timeLeft = Math.max(0, endTime - Date.now());
  const hoursLeft = Math.floor(timeLeft / (1000 * 60 * 60));

  return (
    <div className="bg-white nb-border nb-shadow p-6 mb-6">
      <h2 className="text-xl font-bold mb-4">Market Snapshot</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <p className="text-sm text-gray-600">Metric</p>
          <p className="text-xl font-bold capitalize">{metric}</p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Target</p>
          <p className="text-xl font-bold">{targetValue}</p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Time Left</p>
          <p className="text-xl font-bold">{hoursLeft}h</p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Volume</p>
          <p className="text-xl font-bold">{totalVolume}</p>
        </div>
      </div>
    </div>
  );
}
