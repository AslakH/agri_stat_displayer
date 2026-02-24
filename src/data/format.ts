export const formatPercent = (value?: number): string => {
  if (typeof value !== "number") {
    return "N/A";
  }

  return `${value.toFixed(1)}%`;
};

export const formatNumber = (value?: number): string => {
  if (typeof value !== "number") {
    return "N/A";
  }

  return Number.isInteger(value) ? `${value}` : value.toFixed(1);
};
