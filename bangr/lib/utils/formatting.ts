export function formatNumber(num: number | undefined): string {
  if (num === undefined || num === null) return "0";

  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toString();
}

export function formatPrice(price: number | bigint): string {
  if (typeof price === "bigint") {
    return `$${(Number(price) / 100).toFixed(2)}`;
  }
  return `$${price.toFixed(2)}`;
}

export function formatViews(views: number | undefined): string {
  return formatNumber(views);
}
