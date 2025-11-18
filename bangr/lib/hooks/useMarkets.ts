import { useState, useEffect } from "react";
import { useReadContract, usePublicClient, useWatchContractEvent } from "wagmi";
import { ADDRESSES, MARKET_FACTORY_ABI } from "@/lib/contracts";

export function useMarkets() {
  const [markets, setMarkets] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(0);

  const publicClient = usePublicClient();

  // Get total number of markets
  const { data: nextMarketId, refetch: refetchCount } = useReadContract({
    address: ADDRESSES.MARKET_FACTORY,
    abi: MARKET_FACTORY_ABI,
    functionName: "nextMarketId",
  });

  const totalMarkets = nextMarketId ? Number(nextMarketId) - 1 : 0;

  // Fetch markets when count changes
  useEffect(() => {
    async function fetchMarkets() {
      if (!publicClient || totalMarkets === 0) {
        setMarkets([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);

      try {
        const marketPromises = [];
        for (let marketId = 0; marketId < totalMarkets; marketId++) {
          marketPromises.push(
            publicClient.readContract({
              address: ADDRESSES.MARKET_FACTORY,
              abi: MARKET_FACTORY_ABI,
              functionName: "getMarket",
              args: [BigInt(marketId)],
            })
          );
        }

        const marketResults = await Promise.all(marketPromises);
        const fetchedMarkets = marketResults.map((market: any, index) => ({
          ...market,
          index: index,
        }));

        setMarkets(fetchedMarkets);
      } catch (error) {
        console.error("Error fetching markets:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchMarkets();
  }, [totalMarkets, publicClient, lastUpdate]);

  // Watch for new markets being created
  useWatchContractEvent({
    address: ADDRESSES.MARKET_FACTORY,
    abi: MARKET_FACTORY_ABI,
    eventName: 'MarketCreated',
    onLogs() {
      console.log('[useMarkets] MarketCreated event detected - refetching');
      refetchCount();
      setLastUpdate(Date.now());
    },
  });

  // Watch for markets being resolved
  useWatchContractEvent({
    address: ADDRESSES.MARKET_FACTORY,
    abi: MARKET_FACTORY_ABI,
    eventName: 'MarketResolved',
    onLogs() {
      console.log('[useMarkets] MarketResolved event detected - refetching');
      setLastUpdate(Date.now());
    },
  });

  const refetch = () => {
    console.log('[useMarkets] Manual refetch triggered');
    refetchCount();
    setLastUpdate(Date.now());
  };

  return { markets, isLoading, totalMarkets, refetch };
}
