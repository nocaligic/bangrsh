'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { parseUnits } from 'viem';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { Button } from './ui/button';

const USDC_ADDRESS = process.env.NEXT_PUBLIC_USDC_ADDRESS as `0x${string}`;

const ERC20_ABI = [
  {
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' }
    ],
    name: 'mint',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  }
] as const;

export function MintUSDCButton({ className }: { className?: string }) {
  const { address } = useAccount();
  const [isPending, setIsPending] = useState(false);

  const { writeContract, data: hash } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  // Reset isPending when transaction succeeds
  if (isSuccess && isPending) {
    setIsPending(false);
  }

  const handleMint = async () => {
    if (!address) return;

    try {
      setIsPending(true);
      writeContract({
        address: USDC_ADDRESS,
        abi: ERC20_ABI,
        functionName: 'mint',
        args: [address, parseUnits('1000', 6)], // 1000 USDC with 6 decimals
      });
    } catch (error) {
      console.error('Error minting USDC:', error);
      setIsPending(false);
    }
  };

  if (!address) return null;

  return (
    <Button
      onClick={handleMint}
      disabled={isPending || isConfirming}
      className={className || "nb-button bg-green-500 text-black px-4 py-2 text-sm font-pixel"}
    >
      {isPending || isConfirming ? 'Minting...' : 'Mint Test USDC'}
    </Button>
  );
}
