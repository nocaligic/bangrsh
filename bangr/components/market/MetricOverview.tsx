"use client";

interface MetricOverviewProps {
  currentValue: number;
  targetValue: number;
  metric: string;
}

export function MetricOverview({
  currentValue,
  targetValue,
  metric,
}: MetricOverviewProps) {
  const progress = (currentValue / targetValue) * 100;

  return (
    <div className="bg-white nb-border nb-shadow p-6 mb-6">
      <h2 className="text-xl font-bold mb-4">Current Metrics</h2>
      <div className="space-y-4">
        <div>
          <div className="flex justify-between mb-2">
            <span className="font-semibold capitalize">{metric}</span>
            <span className="font-bold">
              {currentValue.toLocaleString()} / {targetValue.toLocaleString()}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-4 nb-border">
            <div
              className="bg-green-500 h-full rounded-full transition-all"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
