export function fmtDate(iso, opts = {}) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString("he-IL", {
      year: "2-digit",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      ...opts,
    });
  } catch {
    return iso;
  }
}

export function fmtMessageTime(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString("he-IL", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}
