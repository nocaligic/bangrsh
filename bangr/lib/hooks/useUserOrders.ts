import { useState, useEffect } from "react";
import { useAccount, useReadContract, usePublicClient } from "wagmi";
import { getContractAddress } from "@/lib/contracts/addresses";
import abis from "@/lib/contracts/abis.json";
import { useChainId } from "wagmi";

interface Order {
  orderId: number;
  marketId: number;
  outcome: "YES" | "NO";
  shares: number;
  pricePerShare: number;
  totalCost: number;
}

export function useUserOrders() {
  const { address } = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const orderBookAddress = getContractAddress(chainId, "orderBook");

  useEffect(() => {
    async function fetchOrders() {
      if (!address || !publicClient) {
        setOrders([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);

      try {
        // Get user's orders from the order book
        const userOrders = (await publicClient.readContract({
          address: orderBookAddress,
          abi: abis.orderBook,
          functionName: "getUserOrders",
          args: [address],
        })) as any[];

        // Transform the orders
        const transformedOrders: Order[] = userOrders
          .filter((order: any) => order.isActive) // Only active orders
          .map((order: any, index: number) => ({
            orderId: index,
            marketId: Number(order.marketId),
            outcome: order.isYesShare ? "YES" : "NO",
            shares: Number(order.shares) / 1e6, // Assuming 6 decimals
            pricePerShare: Number(order.pricePerShare) / 1e6,
            totalCost: (Number(order.shares) * Number(order.pricePerShare)) / 1e12,
          }));

        setOrders(transformedOrders);
      } catch (error) {
        console.error("Error fetching user orders:", error);
        setOrders([]);
      } finally {
        setIsLoading(false);
      }
    }

    fetchOrders();
  }, [address, publicClient, orderBookAddress]);

  const getTotalLocked = () => {
    return orders.reduce((sum, order) => sum + order.totalCost, 0);
  };

  return {
    orders,
    isLoading,
    getTotalLocked,
  };
}
