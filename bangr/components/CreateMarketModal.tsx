import { useState, useEffect } from "react";
import { X, ExternalLink, AlertCircle, Loader2 } from "lucide-react";
import { Input } from "./ui/input";
import { TransactionStatusAlert } from "./TransactionStatusAlert";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseUnits } from "viem";
import { ADDRESSES, MARKET_FACTORY_ABI, ERC20_ABI } from "@/lib/contracts";
import { formatViews } from "@/lib/utils/formatting";
import { useApprovalFlow } from "@/lib/hooks/useApprovalFlow";
import { fetchTweetMetrics, validateMetricThreshold } from "@/lib/utils/twitter";

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
    text: string;
    tweetId: string;
    quotedTweet?: {
      tweetId: string;
      text: string;
      authorHandle: string;
      authorName: string;
    } | null;
    metrics: {
      views: MetricData;
      likes: MetricData;
      retweets: MetricData;
      replies: MetricData;
    };
  } | null>(null);

  const { address, isConnected } = useAccount();

  // Wagmi hook for creating market
  const { writeContract: writeCreateMarket, data: createHash, isPending: isCreatePending } = useWriteContract();
  const { isLoading: isCreateConfirming, isSuccess: isCreateSuccess, isError: isCreateError, error: createTxError } = useWaitForTransactionReceipt({
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
    if (isCreateSuccess && txStep === "executing") {
      markSuccess();
      setTimeout(() => {
        setTweetUrl("");
        setPreviewData(null);
        reset();
        onClose();
      }, 2000);
    }
  }, [isCreateSuccess, txStep, markSuccess, reset, onClose]);

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

  if (!isOpen) return null;

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

      // Validate that at least one metric meets minimum thresholds
      const viewsValid = validateMetricThreshold('views', tweetData.metrics.views);
      const likesValid = validateMetricThreshold('likes', tweetData.metrics.likes);
      const retweetsValid = validateMetricThreshold('retweets', tweetData.metrics.retweets);
      const repliesValid = validateMetricThreshold('replies', tweetData.metrics.replies);

      if (!viewsValid.valid && !likesValid.valid && !retweetsValid.valid && !repliesValid.valid) {
        setError("Tweet doesn't meet minimum requirements for any metric. Need: 10K views OR 500 likes OR 100 retweets OR 50 replies.");
        setIsFetchingTweet(false);
        return;
      }

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
        text: tweetData.text,
        tweetId: tweetData.tweetId,
        quotedTweet: tweetData.quotedTweet || null,
        metrics: metricsData,
      });

      // Auto-select first available metric
      if (viewsValid.valid) setSelectedMetric('views');
      else if (likesValid.valid) setSelectedMetric('likes');
      else if (retweetsValid.valid) setSelectedMetric('retweets');
      else if (repliesValid.valid) setSelectedMetric('replies');
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
    } catch (err: any) {
      console.error("Transaction error:", err);
      setError(err.message || "Transaction failed");
    }
  };

  const isLoading = isApprovalLoading || isCreatePending || isCreateConfirming;

  // formatViews moved to @/lib/utils/formatting

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div 
        className="bg-white nb-border nb-shadow p-8 w-full max-w-2xl z-10 max-h-[90vh] overflow-y-auto"
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
            {/* Tweet Preview */}
            <div className="p-4 bg-gray-100 nb-border">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 border-2 border-black flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-600 mb-1">@{previewData.username} • Now</p>
                  <p className="text-gray-800 text-sm mb-2">{previewData.text}</p>

                  {/* Quoted Tweet */}
                  {previewData.quotedTweet && (
                    <div className="mt-2 p-3 bg-white nb-border rounded-lg">
                      <div className="flex items-start gap-2">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 border border-black flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-gray-600 mb-1">
                            @{previewData.quotedTweet.authorHandle}
                          </p>
                          <p className="text-gray-700 text-xs line-clamp-3">
                            {previewData.quotedTweet.text}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Metric Selection */}
            {Object.entries(previewData.metrics).map(([key, metric]) => {
              const metricKey = key as MetricType;
              if (!metric.available) return null;
              return (
                <div key={metricKey} onClick={() => setSelectedMetric(metricKey)} className={`p-4 nb-border cursor-pointer ${selectedMetric === metricKey ? 'bg-yellow-200' : 'bg-neutral-100'}`}>
                  <div className="flex items-start gap-3">
                    <input
                      type="radio"
                      name="metric"
                      checked={selectedMetric === metricKey}
                      onChange={() => setSelectedMetric(metricKey)}
                      className="mt-1 w-5 h-5"
                    />
                    <div className="flex-1">
                      <p style={{ fontWeight: 700 }} className="mb-1">{metricKey.charAt(0).toUpperCase() + metricKey.slice(1)}</p>
                      <p className="text-sm text-gray-700 mb-2">
                        Will this hit <span style={{ fontWeight: 600 }}>{formatViews(metric.target)}</span> {metricKey} in 24h?
                      </p>
                      <div className="flex items-center gap-3 text-xs text-gray-600">
                        <span>Current: {formatViews(metric.current)}</span>
                        <span>•</span>
                        <span>Target: {formatViews(metric.target)} (20x)</span>
                      </div>
                    </div>
                  </div>
                </div>
              )
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
            <div className="mt-3 p-2 bg-blue-50 rounded-lg">
              <p className="text-xs text-gray-700">
                <span style={{ fontWeight: 600 }}>Minimum thresholds:</span> Views: 10K | Likes: 500 | Retweets: 100 | Replies: 50
              </p>
            </div>
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
