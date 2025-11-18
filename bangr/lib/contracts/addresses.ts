// Contract addresses for different networks
// Update these after deploying to BNB testnet/mainnet

export const contracts = {
  // Local Hardhat network (for development)
  hardhat: {
    usdc: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
    shareToken: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
    marketFactory: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
    orderBook: '0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9',
    oracle: '0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9',
  },
  // BNB Testnet (97)
  bscTestnet: {
    usdc: '0x64142706680e2707e5D23887505c5DD54855a779', // MockUSDC (mintable)
    shareToken: '0x537c9f1a5A96B4C2BAe09A215050f97A7B6167a0',
    marketFactory: '0x3ffB880761A8E9c0cDF40718AC8BAEFEf40aC627',
    orderBook: '0xefEbeA058D3e6cAaD96F9674Bc88ba3721FBa205',
    oracle: '0x159c2D054c950f3fAC63d1806ce044285aCc059d',
  },
  // BNB Mainnet (56)
  bscMainnet: {
    usdc: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d', // Real USDC on BSC
    shareToken: '',
    marketFactory: '',
    orderBook: '',
    oracle: '',
  },
} as const;

export type NetworkName = keyof typeof contracts;

export function getContractAddress(
  chainId: number,
  contractName: keyof typeof contracts.hardhat
): `0x${string}` {
  let network: NetworkName;

  switch (chainId) {
    case 1337: // Hardhat
    case 31337: // Hardhat alternative
      network = 'hardhat';
      break;
    case 97: // BNB Testnet
      network = 'bscTestnet';
      break;
    case 56: // BNB Mainnet
      network = 'bscMainnet';
      break;
    default:
      throw new Error(`Unsupported chain ID: ${chainId}`);
  }

  const address = contracts[network][contractName];
  if (!address) {
    throw new Error(`Contract ${contractName} not deployed on ${network}`);
  }

  return address as `0x${string}`;
}
