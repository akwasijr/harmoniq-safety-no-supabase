// Characters that can trigger formula execution in Excel/LibreOffice
const FORMULA_TRIGGERS = new Set(["=", "+", "-", "@", "\t", "\r"]);

export function downloadCsv(filename: string, rows: Record<string, string | number | null | undefined>[]) {
  if (typeof window === "undefined") return;
  if (!rows.length) return;

  // Collect ALL unique headers across every row (not just the first)
  const headerSet = new Set<string>();
  for (const row of rows) {
    for (const key of Object.keys(row)) headerSet.add(key);
  }
  const headers = Array.from(headerSet);

  const escape = (value: unknown) => {
    const str = value === null || value === undefined ? "" : String(value);

    // CSV injection protection: prefix formula-triggering characters with a single-quote
    const sanitized = str.length > 0 && FORMULA_TRIGGERS.has(str.charAt(0))
      ? `'${str}`
      : str;

    if (sanitized.includes('"') || sanitized.includes(",") || sanitized.includes("\n")) {
      return `"${sanitized.replace(/"/g, '""')}"`;
    }
    return sanitized;
  };

  const csv = [
    headers.join(","),
    ...rows.map((row) => headers.map((h) => escape(row[h])).join(",")),
  ].join("\n");

  // Prepend UTF-8 BOM so Excel correctly handles international characters (NL/SV)
  const BOM = "\uFEFF";
  const blob = new Blob([BOM + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
