/**
 * Centralized type definitions for Bangr prediction markets
 */

/**
 * Market metric types
 */
export type MetricType = 'VIEWS' | 'LIKES' | 'RETWEETS' | 'COMMENTS';

/**
 * Market duration types
 */
export type Duration = 'HOUR_1' | 'HOUR_6' | 'HOUR_12' | 'DAY_1';

/**
 * Market resolution status
 */
export type ResolutionStatus = 'ACTIVE' | 'RESOLVED_YES' | 'RESOLVED_NO' | 'INVALID';

/**
 * User position in a market
 */
export interface UserPosition {
  marketId: number;
  username: string;
  displayName: string;
  metric: number; // Contract metric enum, 0=views,1=likes,2=retweets,3=replies
  outcome: 'YES' | 'NO';
  shares: number;
  invested: number;
  avgPrice: number;
  marketTitle: string;
  currentPrice: number;
  color: string;
  currentValue: number;
  endTime: number;
  status: number; // 0=PENDING, 1=RESOLVED_YES, 2=RESOLVED_NO, 3=RESOLVED_INVALID
  isRedeemable: boolean; // Can user claim winnings?
  redeemableAmount?: number; // USDC amount user can claim
}

/**
 * Market data structure from smart contract
 */
export interface Market {
  id: number;
  tweetUrl: string;
  tweetId: string;
  authorHandle: string;
  scout: string;
  claimedBy: string;
  isClaimed: boolean;
  metric: number;  // Enum value from contract
  duration: number; // Enum value from contract
  currentValue: bigint;
  targetValue: bigint;
  multiplier: bigint;
  startTime: bigint;
  endTime: bigint;
  status: number;  // Enum value from contract
  yesTokenId: bigint;
  noTokenId: bigint;
}

/**
 * Simplified market data for UI display
 */
export interface MarketDisplay {
  id: number;
  username: string;
  displayName: string;
  tweetText: string;
  currentViews: number;
  targetViews: number;
  yesPrice: number;
  noPrice: number;
  endTime: number;
  totalVolume: number;
  color: string;
}

/**
 * Order data from order book
 */
export interface Order {
  orderId: number;
  marketId: number;
  maker: string;
  isBuyOrder: boolean;
  isYesShare: boolean;
  shares: bigint;
  pricePerShare: bigint;
  filledShares: bigint;
  cancelled: boolean;
  timestamp: bigint;
}

/**
 * Trading modal props (for consistency)
 */
export interface TradingModalProps {
  isOpen: boolean;
  onClose: () => void;
  marketId: number;
  marketTitle: string;
  outcome: 'YES' | 'NO';
  currentPrice: number;
  username: string;
  displayName: string;
  color: string;
}
