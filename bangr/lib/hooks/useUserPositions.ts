import { useEffect, useState } from 'react';
import { useAccount, useChainId, useReadContract, usePublicClient, useWatchContractEvent } from 'wagmi';
import { formatUnits } from 'viem';
import { getContractAddress } from '../contracts/addresses';
import abis from '../contracts/abis.json';
import { UserPosition } from '../types/market';
import { DEFAULT_CHAIN_ID, DEFAULT_PRICES } from '../constants';
import { useTradeHistory } from './useTradeHistory';

export type { UserPosition };

export function useUserPositions() {
  const { address } = useAccount();
  const chainId = useChainId() || DEFAULT_CHAIN_ID;
  const publicClient = usePublicClient({ chainId });
  const [positions, setPositions] = useState<UserPosition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(0);
  
  // Get trade history for accurate cost tracking
  const { getTotalSpent, getAveragePurchasePrice, isLoading: tradesLoading } = useTradeHistory();

  const marketFactoryAddress = getContractAddress(chainId, 'marketFactory');
  const shareTokenAddress = getContractAddress(chainId, 'shareToken');

  // Get next market ID (markets are numbered 1, 2, 3, etc.)
  const { data: nextMarketId } = useReadContract({
    address: marketFactoryAddress,
    abi: abis.marketFactory,
    functionName: 'nextMarketId',
    chainId,
  });

  useEffect(() => {
    async function fetchPositions() {
      console.log('[useUserPositions] Starting fetch...', {
        hasAddress: !!address,
        nextMarketId: nextMarketId?.toString(),
        hasPublicClient: !!publicClient,
        chainId
      });

      if (!address || !nextMarketId || !publicClient || tradesLoading) {
        console.log('[useUserPositions] Missing requirements, returning empty');
        setPositions([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      const userPositions: UserPosition[] = [];

      try {
        // nextMarketId is the NEXT ID to be used, so existing markets are 1 to (nextMarketId - 1)
        const count = Number(nextMarketId) - 1;
        console.log('[useUserPositions] Fetching positions for', count, 'markets (nextMarketId:', nextMarketId.toString(), ')');

        for (let i = 1; i <= count; i++) {
          try {
            // Fetch market data
            const market = await publicClient.readContract({
              address: marketFactoryAddress,
              abi: abis.marketFactory,
              functionName: 'getMarket',
              args: [BigInt(i)],
            }) as any;

            // Get YES token ID and balance
            const yesTokenId = await publicClient.readContract({
              address: shareTokenAddress,
              abi: abis.shareToken,
              functionName: 'getYesTokenId',
              args: [BigInt(i)],
            }) as bigint;

            const yesBalance = await publicClient.readContract({
              address: shareTokenAddress,
              abi: abis.shareToken,
              functionName: 'balanceOf',
              args: [address, yesTokenId],
            }) as bigint;

            // Get NO token ID and balance
            const noTokenId = await publicClient.readContract({
              address: shareTokenAddress,
              abi: abis.shareToken,
              functionName: 'getNoTokenId',
              args: [BigInt(i)],
            }) as bigint;

            const noBalance = await publicClient.readContract({
              address: shareTokenAddress,
              abi: abis.shareToken,
              functionName: 'balanceOf',
              args: [address, noTokenId],
            }) as bigint;

            // Add YES position if user has shares
            if (yesBalance > 0n) {
              const shares = parseFloat(formatUnits(yesBalance, 18));
              const currentPrice = DEFAULT_PRICES.YES_SHARE;
              const currentValue = (shares * currentPrice) / 100;
              const status = Number(market.status); // 0=PENDING, 1=RESOLVED_YES, 2=RESOLVED_NO, 3=RESOLVED_INVALID

              // Get actual cost from trade history
              const actualCost = getTotalSpent(i, 'YES');
              const avgPurchasePrice = getAveragePurchasePrice(i, 'YES');
              
              // Use actual cost if available, otherwise estimate
              const invested = actualCost > 0 ? actualCost : currentValue;
              const avgPrice = avgPurchasePrice > 0 ? avgPurchasePrice * 100 : currentPrice; // Convert to cents

              // Calculate if redeemable and payout amount
              let isRedeemable = false;
              let redeemableAmount = 0;

              if (status === 1) { // RESOLVED_YES
                isRedeemable = true;
                redeemableAmount = shares * 1; // $1 per share
              } else if (status === 3) { // RESOLVED_INVALID
                isRedeemable = true;
                redeemableAmount = shares * 0.5; // $0.50 per share
              }
              // status === 2 (RESOLVED_NO) means YES shares are worthless, not redeemable

              console.log(`[useUserPositions] Found YES position for market ${i}:`, {
                shares,
                yesBalance: yesBalance.toString(),
                currentPrice,
                currentValue,
                actualCost,
                avgPurchasePrice,
                invested,
                avgPrice,
                status,
                isRedeemable,
                redeemableAmount
              });

              userPositions.push({
                marketId: i,
                username: market.authorHandle || 'unknown',
                displayName: market.authorHandle || 'Unknown',
                metric: Number(market.metric || 0),
                outcome: 'YES',
                shares,
                invested, // Actual amount spent
                avgPrice, // Actual average price paid
                marketTitle: `Will ${market.authorHandle}'s tweet reach ${Number(market.targetValue).toLocaleString()} views?`,
                currentPrice,
                color: 'bg-gradient-to-br from-green-300 to-green-400',
                currentValue,
                endTime: Number(market.endTime),
                status,
                isRedeemable,
                redeemableAmount,
              });
            }

            // Add NO position if user has shares
            if (noBalance > 0n) {
              const shares = parseFloat(formatUnits(noBalance, 18));
              const currentPrice = DEFAULT_PRICES.NO_SHARE;
              const currentValue = (shares * currentPrice) / 100;
              const status = Number(market.status); // 0=PENDING, 1=RESOLVED_YES, 2=RESOLVED_NO, 3=RESOLVED_INVALID

              // Get actual cost from trade history
              const actualCost = getTotalSpent(i, 'NO');
              const avgPurchasePrice = getAveragePurchasePrice(i, 'NO');
              
              // Use actual cost if available, otherwise estimate
              const invested = actualCost > 0 ? actualCost : currentValue;
              const avgPrice = avgPurchasePrice > 0 ? avgPurchasePrice * 100 : currentPrice; // Convert to cents

              // Calculate if redeemable and payout amount
              let isRedeemable = false;
              let redeemableAmount = 0;

              if (status === 2) { // RESOLVED_NO
                isRedeemable = true;
                redeemableAmount = shares * 1; // $1 per share
              } else if (status === 3) { // RESOLVED_INVALID
                isRedeemable = true;
                redeemableAmount = shares * 0.5; // $0.50 per share
              }
              // status === 1 (RESOLVED_YES) means NO shares are worthless, not redeemable

              userPositions.push({
                marketId: i,
                username: market.authorHandle || 'unknown',
                displayName: market.authorHandle || 'Unknown',
                metric: Number(market.metric || 0),
                outcome: 'NO',
                shares,
                invested, // Actual amount spent
                avgPrice, // Actual average price paid
                marketTitle: `Will ${market.authorHandle}'s tweet reach ${Number(market.targetValue).toLocaleString()} views?`,
                currentPrice,
                color: 'bg-gradient-to-br from-red-300 to-red-400',
                currentValue,
                endTime: Number(market.endTime),
                status,
                isRedeemable,
                redeemableAmount,
              });
            }
          } catch (error) {
            console.error(`Error fetching market ${i}:`, error);
          }
        }

        console.log('[useUserPositions] Finished fetching. Total positions:', userPositions.length);
        setPositions(userPositions);
      } catch (error) {
        console.error('[useUserPositions] Error fetching user positions:', error);
        setPositions([]);
      } finally {
        setIsLoading(false);
      }
    }

    fetchPositions();
  }, [address, nextMarketId, chainId, publicClient, marketFactoryAddress, shareTokenAddress, lastUpdate, tradesLoading, getTotalSpent, getAveragePurchasePrice]);

  // Watch for share transfers (when shares are bought, sold, or transferred)
  useWatchContractEvent({
    address: shareTokenAddress,
    abi: abis.shareToken,
    eventName: 'TransferSingle',
    chainId,
    onLogs() {
      console.log('[useUserPositions] TransferSingle event detected - refetching');
      setLastUpdate(Date.now());
    },
  });

  // Watch for new markets being created
  useWatchContractEvent({
    address: marketFactoryAddress,
    abi: abis.marketFactory,
    eventName: 'MarketCreated',
    chainId,
    onLogs() {
      console.log('[useUserPositions] MarketCreated event detected - refetching');
      setLastUpdate(Date.now());
    },
  });

  const getTotalInvested = () => {
    return positions.reduce((sum, pos) => sum + pos.invested, 0);
  };

  const getTotalValue = () => {
    return positions.reduce((sum, pos) => sum + pos.currentValue, 0);
  };

  const getTotalProfitLoss = () => {
    return getTotalValue() - getTotalInvested();
  };

  const refetch = () => {
    console.log('[useUserPositions] Manual refetch triggered');
    setLastUpdate(Date.now());
  };

  return {
    positions,
    isLoading,
    getTotalInvested,
    getTotalValue,
    getTotalProfitLoss,
    refetch,
  };
}
