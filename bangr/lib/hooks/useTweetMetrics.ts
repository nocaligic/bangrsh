import { useState, useEffect } from "react";

interface TweetMetrics {
  likes: number;
  retweets: number;
  replies: number;
  views: number;
  bookmarks: number;
  quotes: number;
}

export function useTweetMetrics(tweetId: string | undefined) {
  const [metrics, setMetrics] = useState<TweetMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!tweetId) {
      setIsLoading(false);
      return;
    }

    async function fetchMetrics() {
      try {
        setIsLoading(true);
        const response = await fetch("/api/twitter/metrics", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tweetId }),
        });

        if (!response.ok) {
          throw new Error("Failed to fetch metrics");
        }

        const data = await response.json();
        setMetrics(data);
      } catch (err) {
        setError(err as Error);
        console.error("Error fetching tweet metrics:", err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchMetrics();
  }, [tweetId]);

  return { metrics, isLoading, error };
}
