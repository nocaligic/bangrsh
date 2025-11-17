"use client";

import { X, ExternalLink, Loader2, CheckCircle, AlertCircle } from "lucide-react";

interface TransactionStatusAlertProps {
  isOpen: boolean;
  onClose: () => void;
  status: "pending" | "confirming" | "success" | "error";
  txHash?: string;
  errorMessage?: string;
}

export function TransactionStatusAlert({
  isOpen,
  onClose,
  status,
  txHash,
  errorMessage,
}: TransactionStatusAlertProps) {
  if (!isOpen) return null;

  const getStatusConfig = () => {
    switch (status) {
      case "pending":
        return {
          icon: <Loader2 className="w-6 h-6 animate-spin text-blue-500" />,
          title: "Transaction Pending",
          message: "Please confirm the transaction in your wallet",
          bgColor: "bg-blue-50",
          borderColor: "border-blue-500",
        };
      case "confirming":
        return {
          icon: <Loader2 className="w-6 h-6 animate-spin text-yellow-500" />,
          title: "Confirming Transaction",
          message: "Your transaction is being confirmed on the blockchain",
          bgColor: "bg-yellow-50",
          borderColor: "border-yellow-500",
        };
      case "success":
        return {
          icon: <CheckCircle className="w-6 h-6 text-green-500" />,
          title: "Transaction Successful!",
          message: "Your transaction has been confirmed",
          bgColor: "bg-green-50",
          borderColor: "border-green-500",
        };
      case "error":
        return {
          icon: <AlertCircle className="w-6 h-6 text-red-500" />,
          title: "Transaction Failed",
          message: errorMessage || "Something went wrong with your transaction",
          bgColor: "bg-red-50",
          borderColor: "border-red-500",
        };
    }
  };

  const config = getStatusConfig();

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-4">
      <div
        className="fixed inset-0 bg-black/50"
        onClick={onClose}
      />
      <div
        className={`relative ${config.bgColor} ${config.borderColor} border-3 nb-shadow p-6 max-w-md w-full`}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 hover:bg-black/10 rounded"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-start gap-4">
          {config.icon}
          <div className="flex-1">
            <h3 className="font-bold text-lg mb-2">{config.title}</h3>
            <p className="text-sm text-gray-700 mb-4">{config.message}</p>

            {txHash && (
              <a
                href={`https://bscscan.com/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-blue-600 hover:underline"
              >
                View on Explorer
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
