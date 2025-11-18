import { useState, useEffect } from "react";
import { X, ExternalLink, AlertCircle, Loader2 } from "lucide-react";
import { Input } from "./ui/input";
import { TransactionStatusAlert } from "./TransactionStatusAlert";
import { useAccount, useWriteContract, useWaitForTransactionReceipt, usePublicClient } from "wagmi";
import { parseUnits, decodeEventLog } from "viem";
import { ADDRESSES, MARKET_FACTORY_ABI, ERC20_ABI } from "@/lib/contracts";
import { formatViews } from "@/lib/utils/formatting";
import { useApprovalFlow } from "@/lib/hooks/useApprovalFlow";
import { fetchTweetMetrics, validateMetricThreshold } from "@/lib/utils/twitter";
import confetti from "canvas-confetti";

interface CreateMarketModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type MetricType = 'views' | 'likes' | 'retweets' | 'replies';

interface MetricData {
  current: number;
  target: number;
  available: boolean; // meets minimum threshold
}

export function CreateMarketModal({ isOpen, onClose }: CreateMarketModalProps) {
  const [tweetUrl, setTweetUrl] = useState("");
  const [isFetchingTweet, setIsFetchingTweet] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState<MetricType>('views');
  const [previewData, setPreviewData] = useState<{
    username: string;
    authorName: string;
    avatarUrl: string | null;
    text: string;
    tweetId: string;
    quotedTweet?: {
      tweetId: string;
      text: string;
      authorHandle: string;
      authorName: string;
      avatarUrl?: string | null;
    } | null;
    metrics: {
      views: MetricData;
      likes: MetricData;
      retweets: MetricData;
      replies: MetricData;
    };
  } | null>(null);

  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();

  // Wagmi hook for creating market
  const { writeContract: writeCreateMarket, data: createHash, isPending: isCreatePending } = useWriteContract();
  const { isLoading: isCreateConfirming, isSuccess: isCreateSuccess, isError: isCreateError, error: createTxError, data: createReceipt } = useWaitForTransactionReceipt({
    hash: createHash,
  });

  // Create market transaction function
  const createMarketTransaction = () => {
    if (!previewData) return;

    // Map metric type to contract enum
    const metricTypeMap: Record<MetricType, number> = {
      views: 0,    // MetricType.VIEWS
      likes: 1,    // MetricType.LIKES
      retweets: 2, // MetricType.RETWEETS
      replies: 3,  // MetricType.COMMENTS
    };

    const currentValue = previewData.metrics[selectedMetric].current;

    try {
      writeCreateMarket({
        address: ADDRESSES.MARKET_FACTORY,
        abi: MARKET_FACTORY_ABI,
        functionName: "createMarket",
        args: [
          tweetUrl,
          metricTypeMap[selectedMetric], // Selected metric type
          0, // Duration.ONE_DAY (24 hours)
          BigInt(20), // multiplier (20x)
          BigInt(currentValue), // current value for selected metric
          previewData.tweetId,
          previewData.username
        ],
      });
    } catch (err: any) {
      console.error("Create market error:", err);
      setError(err.message || "Failed to create market");
    }
  };

  // Use approval flow hook
  const {
    execute,
    markSuccess,
    reset,
    txStep,
    error,
    setError,
    isLoading: isApprovalLoading,
  } = useApprovalFlow({
    tokenAddress: ADDRESSES.USDC,
    spenderAddress: ADDRESSES.MARKET_FACTORY,
    requiredAmount: parseUnits("10", 6), // 10 USDC
    onActionExecute: createMarketTransaction,
    enabled: isConnected && !!previewData,
  });

  // Auto-complete after market creation
  useEffect(() => {
    if (isCreateSuccess && txStep === "executing" && previewData && createReceipt) {
      markSuccess();
      
      // Save tweet data to database
      const saveTweetData = async () => {
        try {
          // Extract market ID from MarketCreated event
          let marketId = 0;
          
          if (createReceipt.logs) {
            for (const log of createReceipt.logs) {
              try {
                const decoded = decodeEventLog({
                  abi: MARKET_FACTORY_ABI,
                  data: log.data,
                  topics: log.topics,
                });
                
                if (decoded.eventName === 'MarketCreated') {
                  marketId = Number(decoded.args.marketId);
                  console.log('Market created with ID:', marketId);
                  break;
                }
              } catch (e) {
                // Not a MarketCreated event, continue
              }
            }
          }
          
          if (marketId === 0) {
            console.error("Could not extract market ID from transaction");
            return;
          }
          
          const response = await fetch("/api/markets/save-tweet-data", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              marketId,
              tweetId: previewData.tweetId,
              tweetUrl,
              authorHandle: previewData.username,
              endTime: Math.floor(Date.now() / 1000) + 24 * 60 * 60, // 24 hours from now
              metric: ['views', 'likes', 'retweets', 'replies'].indexOf(selectedMetric),
              targetValue: previewData.metrics[selectedMetric].target.toString(),
              multiplier: 20,
            }),
          });
          
          if (!response.ok) {
            console.error("Failed to save tweet data:", await response.text());
          } else {
            console.log("Tweet data saved successfully for market", marketId);
          }
        } catch (error) {
          console.error("Error saving tweet data:", error);
        }
      };
      
      saveTweetData();
      
      setTimeout(() => {
        setTweetUrl("");
        setPreviewData(null);
        reset();
        onClose();
      }, 2000);
    }
  }, [isCreateSuccess, txStep, markSuccess, reset, onClose, previewData, tweetUrl, selectedMetric, createReceipt]);

  // Handle market creation error
  useEffect(() => {
    if (isCreateError && txStep === "executing") {
      let errorMsg = "Market creation failed. Please try again.";

      // Check if error message contains "Market already exists"
      if (createTxError?.message?.includes("Market already exists") ||
          createTxError?.message?.includes("reverted")) {
        errorMsg = "⚠️ This market already exists! A prediction market for this exact tweet with the same timeframe (24h) and multiplier (20x) has already been created. Please try a different tweet.";
      }

      setError(errorMsg);
      reset();
    }
  }, [isCreateError, createTxError, txStep, reset, setError]);

  // Parse tweet URL to extract ID and username
  const parseTweetUrl = (url: string): { tweetId: string; username: string } | null => {
    try {
      const match = url.match(/(?:twitter\.com|x\.com)\/([^\/]+)\/status\/(\d+)/);
      if (match) {
        return { username: match[1], tweetId: match[2] };
      }
      return null;
    } catch {
      return null;
    }
  };

  const handleUrlChange = async (url: string) => {
    setTweetUrl(url);
    setError(null);
    setPreviewData(null);

    // Parse tweet URL
    const parsed = parseTweetUrl(url);
    if (!parsed) {
      return;
    }

    // Fetch real tweet data from Twitter API
    setIsFetchingTweet(true);
    try {
      const tweetData = await fetchTweetMetrics(parsed.tweetId);

      // Validate metrics (currently no minimum thresholds; all metrics are allowed)
      const viewsValid = validateMetricThreshold('views', tweetData.metrics.views);
      const likesValid = validateMetricThreshold('likes', tweetData.metrics.likes);
      const retweetsValid = validateMetricThreshold('retweets', tweetData.metrics.retweets);
      const repliesValid = validateMetricThreshold('replies', tweetData.metrics.replies);

      // Set preview data with all metrics
      const metricsData = {
        views: {
          current: tweetData.metrics.views,
          target: tweetData.metrics.views * 20,
          available: viewsValid.valid,
        },
        likes: {
          current: tweetData.metrics.likes,
          target: tweetData.metrics.likes * 20,
          available: likesValid.valid,
        },
        retweets: {
          current: tweetData.metrics.retweets,
          target: tweetData.metrics.retweets * 20,
          available: retweetsValid.valid,
        },
        replies: {
          current: tweetData.metrics.replies,
          target: tweetData.metrics.replies * 20,
          available: repliesValid.valid,
        },
      };

      setPreviewData({
        username: tweetData.authorHandle,
        authorName: tweetData.authorName,
        avatarUrl: tweetData.avatarUrl,
        text: tweetData.text,
        tweetId: tweetData.tweetId,
        quotedTweet: tweetData.quotedTweet || null,
        metrics: metricsData,
      });

      // Auto-select views by default (or first metric)
      setSelectedMetric('views');
    } catch (err: any) {
      console.error("Error fetching tweet:", err);
      setError(err.message || "Failed to fetch tweet data. Please check the URL and try again.");
    } finally {
      setIsFetchingTweet(false);
    }
  };

  const handleCreate = async () => {
    if (!isConnected || !address) {
      setError("Please connect your wallet first");
      return;
    }

    if (!previewData) {
      setError("Please enter a valid tweet URL");
      return;
    }

    try {
      await execute(address);
      // Approval + create flow will update txStep via useApprovalFlow.
      // When txStep moves to "success" we can show confetti.
    } catch (err: any) {
      console.error("Transaction error:", err);
      setError(err.message || "Transaction failed");
    }
  };

  const isLoading = isApprovalLoading || isCreatePending || isCreateConfirming;

  // Fire confetti when market creation succeeds
  useEffect(() => {
    if (isCreateSuccess && txStep === "success") {
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#22c55e", "#4ade80", "#bbf7d0"],
      });
    }
  }, [isCreateSuccess, txStep]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div 
        className="bg-white nb-border nb-shadow p-8 w-full max-w-3xl z-10 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button onClick={onClose} className="nb-button bg-white absolute top-4 right-4 p-2">
          <X className="w-6 h-6" strokeWidth={3} />
        </button>

        {/* Header */}
        <div className="mb-6">
          <h2 className="text-3xl mb-2 font-bold">Create Market 💥</h2>
          <p className="text-gray-600">Paste a tweet URL and choose a metric (views, likes, retweets, replies)</p>
          <div className="mt-3 p-3 bg-yellow-100 nb-border">
            <p className="text-sm text-gray-800 font-semibold">
              Auto-calculated: Target = Current Metric × 20 | Timeframe = 24h
            </p>
          </div>
        </div>

        {/* Input */}
        <div className="mb-6">
          <label className="block text-sm mb-2 font-medium">Tweet URL</label>
          <Input
            type="url"
            placeholder="https://twitter.com/username/status/..."
            value={tweetUrl}
            onChange={(e) => handleUrlChange(e.target.value)}
            className="w-full p-3 h-full nb-border nb-shadow bg-white font-medium text-black placeholder-neutral-600 focus:outline-none text-lg"
          />
        </div>

        {/* Loading State */}
        {isFetchingTweet && (
          <div className="mb-6 p-6 bg-blue-100 nb-border flex items-center justify-center gap-3">
            <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
            <p className="text-sm text-blue-800 font-semibold">Fetching tweet data...</p>
          </div>
        )}

        {/* Preview - Multi-Metric Selection */}
        {previewData && !isFetchingTweet && (
          <div className="mb-6 space-y-3">
            {/* Tweet Preview - Styled like Market Detail Page */}
            <div className="bg-white nb-border nb-shadow p-5">
              <div className="flex items-start gap-3 mb-3">
                {/* Profile Picture */}
                {previewData.avatarUrl ? (
                  <img
                    src={previewData.avatarUrl}
                    alt={previewData.authorName}
                    className="w-12 h-12 rounded-full border-2 border-black flex-shrink-0 object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 border-2 border-black flex-shrink-0 flex items-center justify-center">
                    <span className="text-white font-bold text-lg">
                      {previewData.username.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-base">{previewData.authorName}</div>
                  <div className="text-sm text-gray-600">@{previewData.username}</div>
                </div>
              </div>

              {/* Tweet Text */}
              <p className="text-gray-900 text-base leading-relaxed mb-3 whitespace-pre-wrap">
                {previewData.text}
              </p>

              {/* Quoted Tweet */}
              {previewData.quotedTweet && (
                <div className="mt-3 p-4 bg-gray-50 nb-border rounded">
                  <div className="flex items-start gap-2 mb-2">
                    {previewData.quotedTweet.avatarUrl ? (
                      <img
                        src={previewData.quotedTweet.avatarUrl}
                        alt={previewData.quotedTweet.authorName}
                        className="w-8 h-8 rounded-full border border-black flex-shrink-0 object-cover"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 border border-black flex-shrink-0 flex items-center justify-center">
                        <span className="text-white font-semibold text-xs">
                          {previewData.quotedTweet.authorHandle.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm">{previewData.quotedTweet.authorName}</div>
                      <div className="text-xs text-gray-600">@{previewData.quotedTweet.authorHandle}</div>
                    </div>
                  </div>
                  <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">
                    {previewData.quotedTweet.text}
                  </p>
                </div>
              )}
            </div>

            {/* Metric Selection */}
            {Object.entries(previewData.metrics).map(([key, metric]) => {
              const metricKey = key as MetricType;
              const isSelected = selectedMetric === metricKey;
              const cardColor = isSelected ? "bg-yellow-200" : "bg-neutral-100";

              return (
                <div
                  key={metricKey}
                  onClick={() => setSelectedMetric(metricKey)}
                  className={`p-4 nb-border cursor-pointer ${cardColor}`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="radio"
                      name="metric"
                      checked={isSelected}
                      onChange={() => setSelectedMetric(metricKey)}
                      className="mt-1 w-5 h-5"
                    />
                    <div className="flex-1">
                      <p style={{ fontWeight: 700 }} className="mb-1">
                        {metricKey.charAt(0).toUpperCase() + metricKey.slice(1)}
                      </p>
                      <p className="text-sm text-gray-700 mb-2">
                        Will this hit{" "}
                        <span style={{ fontWeight: 600 }}>
                          {formatViews(metric.target)}
                        </span>{" "}
                        {metricKey} in 24h?
                      </p>
                      <div className="flex items-center gap-3 text-xs text-gray-600">
                        <span>Current: {formatViews(metric.current)}</span>
                        <span>•</span>
                        <span>Target: {formatViews(metric.target)} (20x)</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Info Box */}
        {!previewData && !isFetchingTweet && (
          <div className="mb-6 p-4 bg-gray-50 rounded-xl border-2 border-gray-200">
            <h4 className="text-sm mb-2" style={{ fontWeight: 600 }}>How it works:</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Paste any tweet URL</li>
              <li>• We fetch real metrics automatically (views, likes, retweets, replies)</li>
              <li>• Choose which metric you want to create a market for</li>
              <li>• Target is always <span style={{ fontWeight: 600 }}>current metric × 20</span></li>
              <li>• Market runs for <span style={{ fontWeight: 600 }}>24 hours</span></li>
              <li>• Cost: <span style={{ fontWeight: 600 }}>10 USDC</span></li>
            </ul>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border-2 border-red-300 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Transaction Info */}
        {isConnected && previewData && (
          <div className="mb-6 p-4 bg-blue-50 border-2 border-blue-300 rounded-lg">
            <p className="text-sm text-blue-800">
              <span style={{ fontWeight: 600 }}>💰 Transaction Required:</span> Creating a market requires 10 USDC + small BNB gas fee.
            </p>
          </div>
        )}

        {/* Transaction Status */}
        {txStep !== "idle" && (
          <div className="mb-6">
            <TransactionStatusAlert
              step={txStep}
              approvingText="Step 1/2: Approving USDC..."
              executingText="Step 2/2: Creating market..."
              successText="Market created successfully!"
            />
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button onClick={onClose} disabled={isLoading} className="nb-button bg-neutral-200 flex-1 py-4">
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!isConnected || !previewData || isLoading}
            className="nb-button bg-yellow-400 text-black flex-1 py-4"
          >
            {!isConnected ? (
              "Connect Wallet First"
            ) : isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-3 border-black border-t-transparent rounded-full animate-spin" />
                {txStep === "approving" ? "Approving..." : txStep === "executing" ? "Creating..." : "Processing..."}
              </span>
            ) : (
              "Create Market 🚀"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
