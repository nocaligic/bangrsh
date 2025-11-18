import { NextRequest, NextResponse } from "next/server";

const TWITTER_API_KEY = process.env.TWITTER_API_KEY || "new1_76b20b877cdd4fcba5323e4d9f2030dd";
const TWITTER_API_BASE = "https://api.twitterapi.io";

// Simple in-memory cache to reduce API calls
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * POST /api/twitter/metrics
 * Fetch tweet metrics using TwitterAPI.io
 */
export async function POST(request: NextRequest) {
  try {
    const { tweetId } = await request.json();

    if (!tweetId) {
      return NextResponse.json(
        { error: "Tweet ID is required" },
        { status: 400 }
      );
    }

    // Check cache first
    const cached = cache.get(tweetId);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log(`[TwitterAPI] Returning cached data for tweet ${tweetId}`);
      return NextResponse.json(cached.data);
    }

    console.log(`[TwitterAPI] Fetching metrics for tweet ${tweetId}`);
    console.log(`[TwitterAPI] API Key (first 10 chars):`, TWITTER_API_KEY.substring(0, 10));

    // Fetch tweet data from TwitterAPI.io
    const response = await fetch(
      `${TWITTER_API_BASE}/twitter/tweets?tweet_ids=${tweetId}`,
      {
        method: "GET",
        headers: {
          "x-api-key": TWITTER_API_KEY,
          "Content-Type": "application/json",
        },
      }
    );

    console.log(`[TwitterAPI] Response status:`, response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[TwitterAPI] Error: ${response.status} - ${errorText}`);
      
      // If rate limited, return a more helpful error
      if (response.status === 429) {
        return NextResponse.json(
          { 
            error: "Rate limit exceeded. Please try again in a few minutes.",
            tweetId,
            // Return minimal fallback data so UI doesn't break
            text: "Tweet data temporarily unavailable due to rate limiting",
            authorHandle: "unknown",
            authorName: "Unknown",
            views: 0,
            likes: 0,
            retweets: 0,
            replies: 0,
          },
          { status: 200 } // Return 200 so the frontend doesn't error out
        );
      }
      
      return NextResponse.json(
        { error: `Failed to fetch tweet: ${response.statusText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log(`[TwitterAPI] Raw response:`, JSON.stringify(data, null, 2));

    // Extract metrics from TwitterAPI.io response
    // Response format: { tweets: [...], status: "success", msg: "success", code: 0 }
    const tweets = data.tweets || [];

    if (tweets.length === 0) {
      return NextResponse.json(
        { error: "Tweet not found" },
        { status: 404 }
      );
    }

    const tweet = tweets[0];
    const author = tweet.author || tweet.user || {};

    // TwitterAPI.io generally mirrors Twitter v2 fields
    // Try multiple possible shapes for robustness.
    const publicMetrics =
      tweet.public_metrics ||
      tweet.publicMetrics ||
      tweet.metrics ||
      {};

    const views =
      tweet.viewCount ??
      tweet.impressionCount ??
      publicMetrics.impression_count ??
      0;
    const likes = tweet.likeCount ?? publicMetrics.like_count ?? 0;
    const retweets =
      tweet.retweetCount ?? publicMetrics.retweet_count ?? 0;
    const replies =
      tweet.replyCount ?? publicMetrics.reply_count ?? 0;
    const quotes =
      tweet.quoteCount ?? publicMetrics.quote_count ?? 0;
    const bookmarks =
      tweet.bookmarkCount ?? publicMetrics.bookmark_count ?? 0;

    const avatarUrl =
      author.profilePicture ||
      author.profileImageUrl ||
      author.profile_image_url ||
      author.avatar ||
      null;

    // Extract media/images from tweet
    const extendedMedia = tweet.extendedEntities?.media || tweet.entities?.media || tweet.media || [];
    const imageUrl = extendedMedia.length > 0 && extendedMedia[0].type === 'photo'
      ? extendedMedia[0].media_url_https || extendedMedia[0].url || extendedMedia[0].media_url
      : null;

    // Extract quote tweet if it exists
    let quotedTweet = null;
    if (tweet.quotedTweet || tweet.quoted_tweet || tweet.is_quote_status) {
      const quoted = tweet.quotedTweet || tweet.quoted_tweet || {};
      const quotedAuthor = quoted.author || quoted.user || {};
      
      if (quoted.text || quoted.full_text) {
        quotedTweet = {
          tweetId: quoted.id || "",
          text: quoted.text || quoted.full_text || "",
          authorHandle: quotedAuthor.username || quotedAuthor.userName || "unknown",
          authorName: quotedAuthor.name || "Unknown",
          avatarUrl: quotedAuthor.profilePicture || 
                     quotedAuthor.profileImageUrl || 
                     quotedAuthor.profile_image_url || 
                     quotedAuthor.avatar || 
                     null,
        };
      }
    }

    // Return metrics in our expected format
    const tweetMetrics = {
      tweetId: tweet.id || tweetId,
      text: tweet.text || "",
      authorHandle: author.username || author.userName || "unknown",
      authorName: author.name || "Unknown",
      avatarUrl,
      imageUrl,
      quotedTweet,
      views,
      likes,
      retweets,
      replies,
      quotes,
      bookmarks,
    };

    console.log(`[TwitterAPI] Parsed metrics:`, tweetMetrics);

    // Cache the result
    cache.set(tweetId, { data: tweetMetrics, timestamp: Date.now() });

    return NextResponse.json(tweetMetrics);
  } catch (error: any) {
    console.error("[TwitterAPI] Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
