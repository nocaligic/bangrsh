"use client";

import { useState, useEffect } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { useAccount, useChainId, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseUnits, formatUnits } from "viem";
import { Toast } from "./Toast";
import { TransactionStatusAlert } from "./TransactionStatusAlert";
import confetti from "canvas-confetti";
import { getContractAddress } from "@/lib/contracts/addresses";
import abis from "@/lib/contracts/abis.json";
import { ERC20_ABI } from "@/lib/contracts/abis/erc20";
import { DEFAULT_CHAIN_ID, DECIMALS, CHAIN_NAMES } from "@/lib/constants";
import { useApprovalFlow } from "@/lib/hooks/useApprovalFlow";

interface TradeWidgetProps {
  marketId: number;
  marketTitle: string;
  currentPrice: number;
  username: string;
  displayName: string;
  color: string;
  yesTokenId?: bigint;
  noTokenId?: bigint;
}

export function TradeWidget({
  marketId,
  marketTitle,
  currentPrice,
  username,
  displayName,
  color,
  yesTokenId,
  noTokenId,
}: TradeWidgetProps) {
  const { address, isConnected } = useAccount();
  const chainId = useChainId() || DEFAULT_CHAIN_ID;

  const [outcome, setOutcome] = useState<"YES" | "NO">("YES");
  const [tradeMode, setTradeMode] = useState<"buy" | "sell">("buy");
  const [shares, setShares] = useState("");
  const [limitPrice, setLimitPrice] = useState(currentPrice.toString());
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  const tokenId = outcome === "YES" ? yesTokenId : noTokenId;

  const { data: usdcBalance } = useReadContract({
    address: getContractAddress(chainId, 'usdc'),
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
  });

  const { data: shareBalance } = useReadContract({
    address: getContractAddress(chainId, 'shareToken'),
    abi: abis.shareToken,
    functionName: 'balanceOf',
    args: address && tokenId !== undefined ? [address, tokenId] : undefined,
  });

  const usdcBalanceFormatted = usdcBalance ? Number(formatUnits(usdcBalance as bigint, 6)) : 0;
  const shareBalanceFormatted = shareBalance ? Number(formatUnits(shareBalance as bigint, 18)) : 0;

  const numShares = parseFloat(shares) || 0;
  const numLimitPrice = parseFloat(limitPrice) / 100 || 0;
  const totalCost = numShares * numLimitPrice;
  const potentialWin = numShares * (1 - numLimitPrice);

  const { writeContract: writePlaceOrder, data: orderHash, isPending: isOrderPending, error: orderWriteError } = useWriteContract();
  const { isLoading: isOrderConfirming, isSuccess: isOrderSuccess, isError: isOrderError, error: orderReceiptError } = useWaitForTransactionReceipt({ hash: orderHash });

  const placeOrderTransaction = () => {
    if (!address) return;
    try {
      const priceInUSDC = numLimitPrice.toFixed(2);
      writePlaceOrder({
        address: getContractAddress(chainId, 'orderBook'),
        abi: abis.orderBook,
        functionName: 'placeLimitOrder',
        args: [
          BigInt(marketId),
          tradeMode === "buy",
          outcome === "YES",
          parseUnits(numShares.toFixed(2), 18),
          parseUnits(priceInUSDC, 6),
        ],
      });
    } catch (err: any) {
      setError(err.message || "Failed to place order");
    }
  };

  const {
    execute,
    markSuccess,
    reset,
    txStep,
    error,
    setError,
    isLoading: isApprovalLoading,
  } = useApprovalFlow({
    tokenAddress: tradeMode === "buy" ? getContractAddress(chainId, 'usdc') : getContractAddress(chainId, 'shareToken'),
    spenderAddress: getContractAddress(chainId, 'orderBook'),
    requiredAmount: tradeMode === "buy" ? parseUnits(totalCost.toFixed(2), 6) : parseUnits(numShares.toFixed(2), 18),
    onActionExecute: placeOrderTransaction,
    enabled: isConnected && numShares > 0,
  });

  useEffect(() => {
    setShares("");
    reset();
  }, [tradeMode, reset]);

  useEffect(() => {
    if (orderWriteError && txStep === "executing") {
      setError(orderWriteError.message.includes("User rejected") ? "Transaction rejected" : "Failed to submit order transaction");
      reset();
    }
  }, [orderWriteError, txStep, reset, setError]);

  useEffect(() => {
    if (isOrderSuccess && txStep === "executing") {
      markSuccess();
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 }, colors: outcome === "YES" ? ["#4ade80", "#22c55e", "#16a34a"] : ["#f87171", "#ef4444", "#dc2626"] });
      setToastMessage(`Successfully placed ${tradeMode} order for ${numShares.toFixed(2)} ${outcome} shares!`);
      setShowToast(true);
      setTimeout(() => {
        setShares("");
        setLimitPrice(currentPrice.toString());
        reset();
      }, 2000);
    }
  }, [isOrderSuccess, txStep, markSuccess, reset, outcome, numShares, tradeMode, currentPrice]);

  useEffect(() => {
    if (isOrderError && txStep === "executing") {
      setError("Order transaction failed on-chain. Please try again.");
      reset();
    }
  }, [isOrderError, orderReceiptError, txStep, reset, setError]);

  const handleTrade = async () => {
    if (!isConnected || !address) {
      setError("Please connect your wallet first");
      return;
    }
    if (numShares <= 0) {
      setError("Please enter valid shares amount");
      return;
    }
    if (tradeMode === "buy" && totalCost > usdcBalanceFormatted) {
      setError("Insufficient USDC balance");
      return;
    }
    if (tradeMode === "sell" && numShares > shareBalanceFormatted) {
      setError(`Insufficient ${outcome} shares`);
      return;
    }
    try {
      await execute(address);
    } catch (err: any) {
      setError(err.message || "Transaction failed");
    }
  };

  const isLoading = isApprovalLoading || isOrderPending || isOrderConfirming;
  const outcomeColor = outcome === "YES" ? "bg-green-500" : "bg-red-500";
  const outcomeColorLight = outcome === "YES" ? "bg-green-100" : "bg-red-100";

  // Fetch share balances for both YES and NO
  const { data: yesShareBalance } = useReadContract({
    address: getContractAddress(chainId, 'shareToken'),
    abi: abis.shareToken,
    functionName: 'balanceOf',
    args: address && yesTokenId !== undefined ? [address, yesTokenId] : undefined,
  });

  const { data: noShareBalance } = useReadContract({
    address: getContractAddress(chainId, 'shareToken'),
    abi: abis.shareToken,
    functionName: 'balanceOf',
    args: address && noTokenId !== undefined ? [address, noTokenId] : undefined,
  });

  const yesShares = yesShareBalance ? Number(formatUnits(yesShareBalance as bigint, 18)) : 0;
  const noShares = noShareBalance ? Number(formatUnits(noShareBalance as bigint, 18)) : 0;

  return (
    <div className="bg-white nb-pattern-dots nb-border nb-shadow flex flex-col h-full">
      {/* Header */}
      <div className="border-b-2 border-black px-4 py-3 flex items-center justify-between bg-black text-yellow-300">
        <div className="text-[11px]">
          <p className="uppercase font-bold tracking-[0.2em] font-pixel">Trade Ticket</p>
          <p className="font-semibold text-white truncate max-w-[220px] mt-1">{marketTitle}</p>
        </div>
        <div className="text-right text-[11px]">
          <p className="font-mono text-yellow-200">#{marketId.toString().padStart(3, "0")}</p>
          <p className="text-yellow-400">@{username}</p>
        </div>
      </div>

      {/* Outcome toggle */}
      <div className="border-b-2 border-black flex bg-neutral-900">
        <button
          onClick={() => setOutcome("YES")}
          className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 transition-all ${
            outcome === "YES" ? "bg-green-500 text-white" : "bg-neutral-800 hover:bg-neutral-700 text-neutral-200"
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          YES
        </button>
        <div className="w-0.5 bg-black" />
        <button
          onClick={() => setOutcome("NO")}
          className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 transition-all ${
            outcome === "NO" ? "bg-red-500 text-white" : "bg-neutral-800 hover:bg-neutral-700 text-neutral-200"
          }`}
        >
          <TrendingDown className="w-4 h-4" />
          NO
        </button>
      </div>

      {/* Buy/Sell tabs */}
      <div className="flex border-b-2 border-black">
        <button
          onClick={() => setTradeMode("buy")}
          className={`flex-1 py-2 text-xs font-bold uppercase tracking-wide transition-all ${
            tradeMode === "buy" ? "bg-yellow-400" : "bg-neutral-800 hover:bg-neutral-700 text-neutral-200"
          }`}
        >
          Buy
        </button>
        <button
          onClick={() => setTradeMode("sell")}
          className={`flex-1 py-2 text-xs font-bold uppercase tracking-wide transition-all ${
            tradeMode === "sell" ? "bg-yellow-400" : "bg-neutral-800 hover:bg-neutral-700 text-neutral-200"
          }`}
        >
          Sell
        </button>
      </div>

      <div className="p-5 space-y-4 flex-1 flex flex-col">
        <div>
          <label className="block text-sm font-bold mb-2">Limit Price</label>
          <div className="flex items-center gap-2">
            <input type="number" value={limitPrice} onChange={(e) => setLimitPrice(e.target.value)} className="w-full p-3 h-full nb-border bg-white font-medium text-black text-center focus:outline-none text-lg" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-bold mb-2">Shares</label>
          <div className="flex items-center gap-2">
            <input type="number" value={shares} onChange={(e) => setShares(e.target.value)} placeholder="0" className="w-full p-3 h-full nb-border bg-white font-medium text-black text-center focus:outline-none text-lg" />
          </div>
          <div className="text-xs text-gray-600 mt-1">
            {tradeMode === "buy" ? `Available: $${usdcBalanceFormatted.toFixed(2)} USDC` : `Available: ${shareBalanceFormatted.toFixed(2)} ${outcome} shares`}
          </div>
        </div>
        {numShares > 0 && (
          <div className={`${outcomeColorLight} p-4 nb-border space-y-2`}>
            <div className="flex justify-between text-sm">
              <span className="font-bold text-gray-700">Total</span>
              <span className="font-bold">${totalCost.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="font-bold text-gray-700">To Win {outcome === "YES" ? "✓" : "✗"}</span>
              <span className={`font-bold ${outcomeColor.replace('bg-', 'text-')}`}>${potentialWin.toFixed(2)}</span>
            </div>
          </div>
        )}
        {error && (
          <div className="bg-red-50 border-2 border-red-300 rounded-lg p-3">
            <div className="text-xs font-bold text-red-800">{error}</div>
          </div>
        )}
        <TransactionStatusAlert step={txStep} approvingText={`Approving ${tradeMode === "buy" ? "USDC" : "shares"}...`} executingText="Placing order..." successText="Order placed!" />

        {/* Primary action */}
        <button
          onClick={handleTrade}
          disabled={!isConnected || numShares <= 0 || isLoading}
          className={`nb-button w-full py-3 text-white text-lg ${
            outcome === "YES" ? "bg-green-500 hover:bg-green-600" : "bg-red-500 hover:bg-red-600"
          }`}
        >
          {isLoading
            ? txStep === "approving"
              ? `Approving ${tradeMode === "buy" ? "USDC" : "Shares"}...`
              : "Placing Order..."
            : !isConnected
            ? "Connect Wallet"
            : `${tradeMode === "buy" ? "Buy" : "Sell"} ${outcome} ${
                numShares > 0 ? numShares.toFixed(0) : ""
              }`}
        </button>
      </div>
      {/* My Holdings */}
      <div className="p-4 border-t-2 border-black">
        <h4 className="font-bold text-sm mb-2">My Holdings</h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span>YES Shares:</span>
            <span className="font-bold">{yesShares.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>NO Shares:</span>
            <span className="font-bold">{noShares.toFixed(2)}</span>
          </div>
        </div>
      </div>
      {showToast && <Toast message={toastMessage} type="success" onClose={() => setShowToast(false)} />}
    </div>
  );
}
