import { useState, useCallback, useEffect } from "react";
import { useWriteContract, useWaitForTransactionReceipt, useReadContract } from "wagmi";

export type TxStep = "idle" | "approving" | "executing" | "success";

interface UseApprovalFlowParams {
  tokenAddress: `0x${string}`;
  spenderAddress: `0x${string}`;
  requiredAmount: bigint;
  onActionExecute: () => void;
  enabled?: boolean;
}

export function useApprovalFlow({
  tokenAddress,
  spenderAddress,
  requiredAmount,
  onActionExecute,
  enabled = true,
}: UseApprovalFlowParams) {
  const [txStep, setTxStep] = useState<TxStep>("idle");
  const [error, setError] = useState<string | null>(null);

  // Approval transaction
  const {
    writeContract: writeApprove,
    data: approvalHash,
    isPending: isApprovePending,
    error: approveWriteError,
  } = useWriteContract();

  const {
    isLoading: isApproveConfirming,
    isSuccess: isApproveSuccess,
    isError: isApproveError,
    error: approveTxError,
  } = useWaitForTransactionReceipt({
    hash: approvalHash,
  });

  // Check current allowance
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: tokenAddress,
    abi: [
      {
        name: "allowance",
        type: "function",
        stateMutability: "view",
        inputs: [
          { name: "owner", type: "address" },
          { name: "spender", type: "address" },
        ],
        outputs: [{ type: "uint256" }],
      },
    ],
    functionName: "allowance",
    args: [tokenAddress, spenderAddress], // Note: This needs user address, will be passed in execute
    query: {
      enabled: false, // We'll manually trigger this
    },
  });

  // Handle approval success
  useEffect(() => {
    if (isApproveSuccess && txStep === "approving") {
      setTxStep("executing");
      onActionExecute();
    }
  }, [isApproveSuccess, txStep, onActionExecute]);

  // Handle approval error
  useEffect(() => {
    if (isApproveError && txStep === "approving") {
      setError(
        approveWriteError?.message?.includes("User rejected")
          ? "Transaction rejected"
          : approveTxError?.message || "Approval failed"
      );
      setTxStep("idle");
    }
  }, [isApproveError, txStep, approveWriteError, approveTxError]);

  const execute = useCallback(
    async (userAddress: `0x${string}`) => {
      if (!enabled) {
        setError("Transaction not enabled");
        return;
      }

      try {
        setError(null);

        // Check allowance first
        const currentAllowance = allowance as bigint | undefined;

        if (!currentAllowance || currentAllowance < requiredAmount) {
          // Need approval
          setTxStep("approving");
          writeApprove({
            address: tokenAddress,
            abi: [
              {
                name: "approve",
                type: "function",
                stateMutability: "nonpayable",
                inputs: [
                  { name: "spender", type: "address" },
                  { name: "amount", type: "uint256" },
                ],
                outputs: [{ type: "bool" }],
              },
            ],
            functionName: "approve",
            args: [spenderAddress, requiredAmount],
          });
        } else {
          // Already approved, execute directly
          setTxStep("executing");
          onActionExecute();
        }
      } catch (err: any) {
        console.error("Execute error:", err);
        setError(err.message || "Transaction failed");
        setTxStep("idle");
      }
    },
    [
      enabled,
      allowance,
      requiredAmount,
      tokenAddress,
      spenderAddress,
      writeApprove,
      onActionExecute,
    ]
  );

  const reset = useCallback(() => {
    setTxStep("idle");
    setError(null);
  }, []);

  const markSuccess = useCallback(() => {
    setTxStep("success");
  }, []);

  const isLoading = isApprovePending || isApproveConfirming;

  return {
    execute,
    reset,
    markSuccess,
    txStep,
    error,
    setError,
    isLoading,
  };
}
