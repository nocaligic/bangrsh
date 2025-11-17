export const MOCK_ACTIVITY = [
  {
    type: "trade",
    user: "0x1234...5678",
    action: "bought",
    shares: 100,
    outcome: "YES",
    price: 0.65,
    timestamp: Date.now() - 300000,
  },
  {
    type: "trade",
    user: "0xabcd...efgh",
    action: "sold",
    shares: 50,
    outcome: "NO",
    price: 0.35,
    timestamp: Date.now() - 600000,
  },
];

export const MOCK_HOLDERS = [
  {
    address: "0x1234...5678",
    yesShares: 100,
    noShares: 0,
    avgPrice: 0.65,
  },
  {
    address: "0xabcd...efgh",
    yesShares: 0,
    noShares: 150,
    avgPrice: 0.35,
  },
];

export function generatePriceHistory(days: number = 7) {
  const history = [];
  const now = Date.now();
  const interval = (days * 24 * 60 * 60 * 1000) / 100;

  for (let i = 0; i < 100; i++) {
    history.push({
      timestamp: now - (100 - i) * interval,
      yesPrice: 0.5 + Math.random() * 0.3,
      noPrice: 0.5 - Math.random() * 0.3,
      volume: Math.floor(Math.random() * 1000),
    });
  }

  return history;
}
