-- DropIndex
DROP INDEX "Market_tweetId_key";

-- CreateIndex
CREATE INDEX "Market_tweetId_idx" ON "Market"("tweetId");
