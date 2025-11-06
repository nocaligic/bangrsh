import { useReadContract, useReadContracts } from 'wagmi';
import { getContractAddress } from '../contracts/addresses';
import abis from '../contracts/abis.json';

// Hook to get a single market's data
export function useMarket(marketId: number, chainId: number) {
  const marketFactoryAddress = getContractAddress(chainId, 'marketFactory');

  const { data, isLoading, error, refetch } = useReadContract({
    address: marketFactoryAddress,
    abi: abis.marketFactory,
    functionName: 'getMarket',
    args: [BigInt(marketId)],
    chainId,
  });

  return {
    market: data,
    isLoading,
    error,
    refetch,
  };
}

// Hook to get order book for a market
export function useOrderBook(
  marketId: number,
  isYesShare: boolean,
  chainId: number
) {
  const orderBookAddress = getContractAddress(chainId, 'orderBook');

  // Get buy orders (bids)
  const { data: buyOrders } = useReadContract({
    address: orderBookAddress,
    abi: abis.orderBook,
    functionName: 'getMarketOrders',
    args: [BigInt(marketId), isYesShare, true],
    chainId,
  });

  // Get sell orders (asks)
  const { data: sellOrders } = useReadContract({
    address: orderBookAddress,
    abi: abis.orderBook,
    functionName: 'getMarketOrders',
    args: [BigInt(marketId), isYesShare, false],
    chainId,
  });

  return {
    buyOrders: buyOrders as any[] || [],
    sellOrders: sellOrders as any[] || [],
  };
}

// Hook to get user's share balance
export function useShareBalance(
  userAddress: `0x${string}`,
  marketId: number,
  isYesShare: boolean,
  chainId: number
) {
  const shareTokenAddress = getContractAddress(chainId, 'shareToken');

  const { data: tokenId } = useReadContract({
    address: shareTokenAddress,
    abi: abis.shareToken,
    functionName: isYesShare ? 'getYesTokenId' : 'getNoTokenId',
    args: [BigInt(marketId)],
    chainId,
  });

  const { data: balance, refetch } = useReadContract({
    address: shareTokenAddress,
    abi: abis.shareToken,
    functionName: 'balanceOf',
    args: tokenId ? [userAddress, tokenId] : undefined,
    chainId,
    query: {
      enabled: !!tokenId,
    },
  });

  return {
    balance: balance as bigint | undefined,
    refetch,
  };
}

// Hook to get user's USDC balance
export function useUSDCBalance(userAddress: `0x${string}`, chainId: number) {
  const usdcAddress = getContractAddress(chainId, 'usdc');

  const { data: balance, refetch } = useReadContract({
    address: usdcAddress,
    abi: [
      {
        name: 'balanceOf',
        type: 'function',
        stateMutability: 'view',
        inputs: [{ name: 'account', type: 'address' }],
        outputs: [{ type: 'uint256' }],
      },
    ],
    functionName: 'balanceOf',
    args: [userAddress],
    chainId,
  });

  return {
    balance: balance as bigint | undefined,
    refetch,
  };
}

// Hook to check USDC allowance
export function useUSDCAllowance(
  userAddress: `0x${string}`,
  spenderAddress: `0x${string}`,
  chainId: number
) {
  const usdcAddress = getContractAddress(chainId, 'usdc');

  const { data: allowance, refetch } = useReadContract({
    address: usdcAddress,
    abi: [
      {
        name: 'allowance',
        type: 'function',
        stateMutability: 'view',
        inputs: [
          { name: 'owner', type: 'address' },
          { name: 'spender', type: 'address' },
        ],
        outputs: [{ type: 'uint256' }],
      },
    ],
    functionName: 'allowance',
    args: [userAddress, spenderAddress],
    chainId,
  });

  return {
    allowance: allowance as bigint | undefined,
    refetch,
  };
}
