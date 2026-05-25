export function formatILS(value) {
  const n = Math.round(Number(value) || 0);
  return n.toLocaleString("he-IL", {
    style: "currency",
    currency: "ILS",
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  });
}

export function toIntString(value) {
  return String(Math.round(Number(value) || 0));
}
