import { NextRequest, NextResponse } from "next/server";

const TWITTER_API_KEY = process.env.TWITTER_API_KEY || "new1_76b20b877cdd4fcba5323e4d9f2030dd";
const TWITTER_API_BASE = "https://api.twitterapi.io";

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

    console.log(`[TwitterAPI] Fetching metrics for tweet ${tweetId}`);

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

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[TwitterAPI] Error: ${response.status} - ${errorText}`);
      return NextResponse.json(
        { error: `Failed to fetch tweet: ${response.statusText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log(`[TwitterAPI] Response:`, JSON.stringify(data, null, 2));

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

    // Return metrics in our expected format
    const tweetMetrics = {
      tweetId: tweet.id || tweetId,
      text: tweet.text || "",
      authorHandle: author.username || author.userName || "unknown",
      authorName: author.name || "Unknown",
      avatarUrl,
      imageUrl,
      views,
      likes,
      retweets,
      replies,
      quotes,
      bookmarks,
    };

    console.log(`[TwitterAPI] Parsed metrics:`, tweetMetrics);

    return NextResponse.json(tweetMetrics);
  } catch (error: any) {
    console.error("[TwitterAPI] Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
