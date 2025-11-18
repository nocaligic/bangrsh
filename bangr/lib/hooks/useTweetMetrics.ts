import { useState, useEffect } from "react";

interface TweetMetricsResponse {
  tweetId: string;
  text: string;
  authorHandle: string;
  authorName: string;
  avatarUrl?: string | null;
  imageUrl?: string | null;
  quotedTweet?: {
    tweetId: string;
    text: string;
    authorHandle: string;
    authorName: string;
    avatarUrl?: string | null;
  } | null;
  views: number;
  likes: number;
  retweets: number;
  replies: number;
  quotes?: number;
  bookmarks?: number;
  error?: string;
}

// Request deduplication: prevent multiple simultaneous requests for the same tweet
const pendingRequests = new Map<string, Promise<TweetMetricsResponse>>();

export function useTweetMetrics(tweetId: string | undefined) {
  const [data, setData] = useState<TweetMetricsResponse | null>(null);
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
        
        // Check if there's already a pending request for this tweet
        let requestPromise = pendingRequests.get(tweetId);
        
        if (!requestPromise) {
          // Try to fetch from database first (fast, no rate limits)
          requestPromise = fetch(`/api/markets/tweet-data?tweetId=${tweetId}`)
            .then(async (response) => {
              if (response.ok) {
                console.log(`[useTweetMetrics] Loaded from database for tweet ${tweetId}`);
                return response.json();
              }
              
              // If not in database, fall back to Twitter API (for backwards compatibility)
              console.log(`[useTweetMetrics] Not in database, fetching from Twitter API for tweet ${tweetId}`);
              const twitterResponse = await fetch("/api/twitter/metrics", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ tweetId }),
              });
              
              if (!twitterResponse.ok) {
                const errorData = await twitterResponse.json().catch(() => ({}));
                throw new Error(errorData.error || "Failed to fetch metrics");
              }
              
              return twitterResponse.json();
            })
            .finally(() => {
              // Clean up pending request
              pendingRequests.delete(tweetId);
            });
          
          pendingRequests.set(tweetId, requestPromise);
        }

        const json = await requestPromise;
        
        // Check if this is a rate limit fallback response
        if (json.error) {
          console.warn(`[useTweetMetrics] ${json.error}`);
        }
        
        setData(json as TweetMetricsResponse);
      } catch (err) {
        setError(err as Error);
        // Only log errors in development
        if (process.env.NODE_ENV === 'development') {
          console.warn("Error fetching tweet metrics:", err);
        }
      } finally {
        setIsLoading(false);
      }
    }

    fetchMetrics();
  }, [tweetId]);

  return { data, isLoading, error };
}
