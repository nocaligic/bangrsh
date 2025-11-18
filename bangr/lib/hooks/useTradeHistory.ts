import { useEffect, useState } from 'react';
import { useAccount, useChainId, usePublicClient } from 'wagmi';
import { formatUnits } from 'viem';
import { getContractAddress } from '../contracts/addresses';
import abis from '../contracts/abis.json';
import { DEFAULT_CHAIN_ID } from '../constants';

export interface Trade {
  marketId: number;
  trader: string;
  isYesShare: boolean;
  isBuy: boolean;
  shares: number;
  pricePerShare: number;
  totalCost: number;
  timestamp: number;
  txHash: string;
}

export function useTradeHistory(marketId?: number) {
  const { address } = useAccount();
  const chainId = useChainId() || DEFAULT_CHAIN_ID;
  const publicClient = usePublicClient({ chainId });
  const [trades, setTrades] = useState<Trade[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const orderBookAddress = getContractAddress(chainId, 'orderBook');

  useEffect(() => {
    async function fetchTrades() {
      if (!publicClient || !address) {
        setTrades([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);

      try {
        // Get TradeExecuted events
        const logs = await publicClient.getLogs({
          address: orderBookAddress,
          event: {
            type: 'event',
            name: 'TradeExecuted',
            inputs: [
              { type: 'uint256', name: 'marketId', indexed: true },
              { type: 'address', name: 'trader', indexed: true },
              { type: 'bool', name: 'isYesShare', indexed: true },
              { type: 'bool', name: 'isBuy' },
              { type: 'uint256', name: 'shares' },
              { type: 'uint256', name: 'pricePerShare' },
              { type: 'uint256', name: 'totalCost' },
              { type: 'uint256', name: 'timestamp' },
            ],
          },
          args: marketId !== undefined ? {
            marketId: BigInt(marketId),
            trader: address,
          } : {
            trader: address,
          },
          fromBlock: 'earliest',
          toBlock: 'latest',
        });

        const tradeHistory: Trade[] = logs.map((log: any) => {
          return {
            marketId: Number(log.args.marketId),
            trader: log.args.trader as string,
            isYesShare: log.args.isYesShare as boolean,
            isBuy: log.args.isBuy as boolean,
            shares: parseFloat(formatUnits(log.args.shares as bigint, 18)),
            pricePerShare: parseFloat(formatUnits(log.args.pricePerShare as bigint, 6)) / 1e12, // Convert to cents
            totalCost: parseFloat(formatUnits(log.args.totalCost as bigint, 6)),
            timestamp: Number(log.args.timestamp),
            txHash: log.transactionHash as string,
          };
        });

        // Sort by timestamp descending (most recent first)
        tradeHistory.sort((a, b) => b.timestamp - a.timestamp);

        console.log('[useTradeHistory] Fetched', tradeHistory.length, 'trades for user', address);
        setTrades(tradeHistory);
      } catch (error) {
        console.error('[useTradeHistory] Error fetching trades:', error);
        setTrades([]);
      } finally {
        setIsLoading(false);
      }
    }

    fetchTrades();
  }, [address, marketId, chainId, publicClient, orderBookAddress]);

  // Calculate total spent for a specific market
  const getTotalSpent = (forMarketId: number, outcome: 'YES' | 'NO') => {
    return trades
      .filter(t => 
        t.marketId === forMarketId && 
        t.isBuy && 
        (outcome === 'YES' ? t.isYesShare : !t.isYesShare)
      )
      .reduce((sum, t) => sum + t.totalCost, 0);
  };

  // Calculate average purchase price
  const getAveragePurchasePrice = (forMarketId: number, outcome: 'YES' | 'NO') => {
    const relevantTrades = trades.filter(t => 
      t.marketId === forMarketId && 
      t.isBuy && 
      (outcome === 'YES' ? t.isYesShare : !t.isYesShare)
    );

    if (relevantTrades.length === 0) return 0;

    const totalCost = relevantTrades.reduce((sum, t) => sum + t.totalCost, 0);
    const totalShares = relevantTrades.reduce((sum, t) => sum + t.shares, 0);

    return totalShares > 0 ? (totalCost / totalShares) : 0;
  };

  return {
    trades,
    isLoading,
    getTotalSpent,
    getAveragePurchasePrice,
  };
}

