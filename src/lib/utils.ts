export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatCost(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(amount);
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

export function calculateMargin(menuPrice: number, cost: number): number {
  if (menuPrice <= 0) return 0;
  return ((menuPrice - cost) / menuPrice) * 100;
}

export function calculateFoodCost(menuPrice: number, cost: number): number {
  if (menuPrice <= 0) return 0;
  return (cost / menuPrice) * 100;
}
