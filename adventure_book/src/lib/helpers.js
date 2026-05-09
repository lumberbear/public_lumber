export function normPhoto(p, i) {
  if (typeof p === "string") {
    return { src: p, align: i % 2 === 0 ? "left" : "right", para: i, comments: [] };
  }
  return { align: "left", para: i, comments: [], ...p };
}

export function formatDate(d) {
  if (!d) return "";
  try {
    return new Date(d + "T12:00:00").toLocaleDateString("en-GB", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return d;
  }
}
