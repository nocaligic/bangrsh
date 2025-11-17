import { getContractAddress, contracts } from "./addresses";
import abisData from "./abis.json";

// Export address utilities
export { getContractAddress, contracts };

// Create a dynamic ADDRESSES object based on current chain
export const ADDRESSES = {
  MARKET_FACTORY: getContractAddress(1337, "marketFactory") as `0x${string}`,
  ORDER_BOOK: getContractAddress(1337, "orderBook") as `0x${string}`,
  SHARE_TOKEN: getContractAddress(1337, "shareToken") as `0x${string}`,
  USDC: getContractAddress(1337, "usdc") as `0x${string}`,
  ORACLE: getContractAddress(1337, "oracle") as `0x${string}`,
};

// Export ABIs
export const MARKET_FACTORY_ABI = abisData.marketFactory as const;
export const ORDER_BOOK_ABI = abisData.orderBook as const;
export const SHARE_TOKEN_ABI = abisData.shareToken as const;
export const ERC20_ABI = abisData.erc20 as const;
export const MOCK_USDC_ABI = abisData.mockUsdc as const;
