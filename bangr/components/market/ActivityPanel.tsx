"use client";

interface Activity {
  type: string;
  user: string;
  action: string;
  shares: number;
  outcome: string;
  price: number;
  timestamp: number;
}

interface ActivityPanelProps {
  activities: Activity[];
}

export function ActivityPanel({ activities }: ActivityPanelProps) {
  return (
    <div className="bg-white nb-border nb-shadow p-6 mb-6">
      <h2 className="text-xl font-bold mb-4">Recent Activity</h2>
      <div className="space-y-3">
        {activities.map((activity, index) => (
          <div key={index} className="flex justify-between items-center py-2 border-b">
            <div>
              <span className="font-mono text-sm">{activity.user}</span>
              <span className="mx-2">{activity.action}</span>
              <span className="font-bold">{activity.shares} {activity.outcome}</span>
            </div>
            <span className="text-sm text-gray-600">
              ${activity.price.toFixed(2)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
