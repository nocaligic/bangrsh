"use client";

import { useState } from "react";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { getContractAddress } from "@/lib/contracts/addresses";
import { useChainId } from "wagmi";
import abis from "@/lib/contracts/abis.json";
import { Loader2 } from "lucide-react";

interface RedeemButtonProps {
  marketId: number;
  outcome: "YES" | "NO";
  shares: number;
  redeemableAmount: number;
  onSuccess?: () => void;
}

export function RedeemButton({
  marketId,
  outcome,
  shares,
  redeemableAmount,
  onSuccess,
}: RedeemButtonProps) {
  const [isRedeeming, setIsRedeeming] = useState(false);
  const chainId = useChainId();

  const { writeContract, data: hash, isPending } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const handleRedeem = async () => {
    try {
      setIsRedeeming(true);
      const shareTokenAddress = getContractAddress(chainId, "shareToken");

      writeContract({
        address: shareTokenAddress,
        abi: abis.shareToken,
        functionName: "redeemWinningShares",
        args: [BigInt(marketId), outcome === "YES"],
      });
    } catch (error) {
      console.error("Error redeeming shares:", error);
      setIsRedeeming(false);
    }
  };

  // Handle success
  if (isSuccess && onSuccess) {
    onSuccess();
    setIsRedeeming(false);
  }

  const loading = isPending || isConfirming || isRedeeming;

  return (
    <button
      onClick={handleRedeem}
      disabled={loading}
      className="nb-button bg-green-500 text-white px-6 py-3 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {loading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="font-bold">Redeeming...</span>
        </>
      ) : (
        <>
          <span className="font-bold">
            Redeem ${redeemableAmount.toFixed(2)}
          </span>
        </>
      )}
    </button>
  );
}
