-- CreateTable
CREATE TABLE "Market" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "tweetId" TEXT NOT NULL,
    "tweetUrl" TEXT NOT NULL,
    "authorHandle" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endTime" DATETIME NOT NULL,
    "metric" INTEGER NOT NULL,
    "targetValue" TEXT NOT NULL,
    "multiplier" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "TweetData" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "marketId" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "authorHandle" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "imageUrl" TEXT,
    "initialViews" INTEGER NOT NULL,
    "initialLikes" INTEGER NOT NULL,
    "initialRetweets" INTEGER NOT NULL,
    "initialReplies" INTEGER NOT NULL,
    "currentViews" INTEGER NOT NULL,
    "currentLikes" INTEGER NOT NULL,
    "currentRetweets" INTEGER NOT NULL,
    "currentReplies" INTEGER NOT NULL,
    "lastUpdated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TweetData_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "Market" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MetricUpdate" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "marketId" INTEGER NOT NULL,
    "views" INTEGER NOT NULL,
    "likes" INTEGER NOT NULL,
    "retweets" INTEGER NOT NULL,
    "replies" INTEGER NOT NULL,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MetricUpdate_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "Market" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Market_tweetId_key" ON "Market"("tweetId");

-- CreateIndex
CREATE UNIQUE INDEX "TweetData_marketId_key" ON "TweetData"("marketId");

-- CreateIndex
CREATE INDEX "MetricUpdate_marketId_timestamp_idx" ON "MetricUpdate"("marketId", "timestamp");
