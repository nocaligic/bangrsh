import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const TWITTER_API_KEY = process.env.TWITTER_API_KEY || "new1_76b20b877cdd4fcba5323e4d9f2030dd";
const TWITTER_API_BASE = "https://api.twitterapi.io";

/**
 * POST /api/markets/save-tweet-data
 * Fetch and save tweet data for a newly created market
 * This is called ONCE when a market is created
 */
export async function POST(request: NextRequest) {
  try {
    const { marketId, tweetId, tweetUrl, authorHandle, endTime, metric, targetValue, multiplier } = await request.json();

    if (!marketId || !tweetId) {
      return NextResponse.json(
        { error: "Market ID and Tweet ID are required" },
        { status: 400 }
      );
    }

    console.log(`[SaveTweetData] Fetching tweet data for market ${marketId}, tweet ${tweetId}`);

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
      console.error(`[SaveTweetData] Twitter API Error: ${response.status} - ${errorText}`);
      return NextResponse.json(
        { error: `Failed to fetch tweet: ${response.statusText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    const tweets = data.tweets || [];

    if (tweets.length === 0) {
      return NextResponse.json(
        { error: "Tweet not found" },
        { status: 404 }
      );
    }

    const tweet = tweets[0];
    const author = tweet.author || tweet.user || {};
    const publicMetrics = tweet.public_metrics || tweet.publicMetrics || tweet.metrics || {};

    const views = tweet.viewCount ?? tweet.impressionCount ?? publicMetrics.impression_count ?? 0;
    const likes = tweet.likeCount ?? publicMetrics.like_count ?? 0;
    const retweets = tweet.retweetCount ?? publicMetrics.retweet_count ?? 0;
    const replies = tweet.replyCount ?? publicMetrics.reply_count ?? 0;

    const avatarUrl = author.profilePicture || author.profileImageUrl || author.profile_image_url || author.avatar || null;
    const extendedMedia = tweet.extendedEntities?.media || tweet.entities?.media || tweet.media || [];
    const imageUrl = extendedMedia.length > 0 && extendedMedia[0].type === 'photo'
      ? extendedMedia[0].media_url_https || extendedMedia[0].url || extendedMedia[0].media_url
      : null;

    // Extract quote tweet if it exists
    let quotedTweetId: string | null = null;
    let quotedTweetText: string | null = null;
    let quotedAuthorHandle: string | null = null;
    let quotedAuthorName: string | null = null;
    let quotedAvatarUrl: string | null = null;
    
    if (tweet.quotedTweet || tweet.quoted_tweet || tweet.is_quote_status) {
      const quoted = tweet.quotedTweet || tweet.quoted_tweet || {};
      const quotedAuthor = quoted.author || quoted.user || {};
      
      if (quoted.text || quoted.full_text) {
        quotedTweetId = quoted.id ? String(quoted.id) : null;
        quotedTweetText = quoted.text || quoted.full_text || null;
        quotedAuthorHandle = quotedAuthor.username || quotedAuthor.userName || null;
        quotedAuthorName = quotedAuthor.name || null;
        quotedAvatarUrl = quotedAuthor.profilePicture || 
                          quotedAuthor.profileImageUrl || 
                          quotedAuthor.profile_image_url || 
                          quotedAuthor.avatar || 
                          null;
      }
    }

    // Save to database
    const market = await prisma.market.upsert({
      where: { id: marketId },
      update: {},
      create: {
        id: marketId,
        tweetId,
        tweetUrl,
        authorHandle,
        endTime: new Date(Number(endTime) * 1000), // Convert Unix timestamp to Date
        metric,
        targetValue: targetValue.toString(),
        multiplier,
      },
    });

    const tweetData = await prisma.tweetData.upsert({
      where: { marketId },
      update: {
        text: tweet.text || "",
        authorHandle: author.username || author.userName || authorHandle,
        authorName: author.name || "Unknown",
        avatarUrl: avatarUrl || null,
        imageUrl: imageUrl || null,
        quotedTweetId: quotedTweetId || null,
        quotedTweetText: quotedTweetText || null,
        quotedAuthorHandle: quotedAuthorHandle || null,
        quotedAuthorName: quotedAuthorName || null,
        quotedAvatarUrl: quotedAvatarUrl || null,
        initialViews: views,
        initialLikes: likes,
        initialRetweets: retweets,
        initialReplies: replies,
        currentViews: views,
        currentLikes: likes,
        currentRetweets: retweets,
        currentReplies: replies,
        lastUpdated: new Date(),
      },
      create: {
        marketId,
        text: tweet.text || "",
        authorHandle: author.username || author.userName || authorHandle,
        authorName: author.name || "Unknown",
        avatarUrl: avatarUrl || null,
        imageUrl: imageUrl || null,
        quotedTweetId: quotedTweetId || null,
        quotedTweetText: quotedTweetText || null,
        quotedAuthorHandle: quotedAuthorHandle || null,
        quotedAuthorName: quotedAuthorName || null,
        quotedAvatarUrl: quotedAvatarUrl || null,
        initialViews: views,
        initialLikes: likes,
        initialRetweets: retweets,
        initialReplies: replies,
        currentViews: views,
        currentLikes: likes,
        currentRetweets: retweets,
        currentReplies: replies,
      },
    });

    // Save initial metric snapshot
    await prisma.metricUpdate.create({
      data: {
        marketId,
        views,
        likes,
        retweets,
        replies,
      },
    });

    console.log(`[SaveTweetData] Saved tweet data for market ${marketId}`);

    return NextResponse.json({ success: true, tweetData });
  } catch (error: any) {
    console.error("[SaveTweetData] Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

