// Characters that can trigger formula execution in Excel/LibreOffice
const FORMULA_TRIGGERS = new Set(["=", "+", "-", "@", "\t", "\r"]);

export function downloadCsv(filename: string, rows: Record<string, string | number | null | undefined>[]) {
  if (typeof window === "undefined") return;
  if (!rows.length) return;

  const headerSet = new Set<string>();
  for (const row of rows) {
    for (const key of Object.keys(row)) headerSet.add(key);
  }
  const headers = Array.from(headerSet);

  const escape = (value: unknown) => {
    const str = value === null || value === undefined ? "" : String(value);
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

  const BOM = "\uFEFF";
  const blob = new Blob([BOM + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/** Download a CSV template with just headers (for import) */
export function downloadCsvTemplate(filename: string, headers: string[]) {
  const BOM = "\uFEFF";
  const csv = headers.join(",") + "\n";
  const blob = new Blob([BOM + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/** Parse a CSV file into an array of row objects */
export async function parseCsv(file: File): Promise<{ headers: string[]; rows: Record<string, string>[] }> {
  const text = await file.text();
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n").filter((l) => l.trim());
  if (lines.length === 0) return { headers: [], rows: [] };

  const parseRow = (line: string): string[] => {
    const cells: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"' && line[i + 1] === '"') { current += '"'; i++; }
        else if (ch === '"') { inQuotes = false; }
        else { current += ch; }
      } else {
        if (ch === '"') { inQuotes = true; }
        else if (ch === ",") { cells.push(current.trim()); current = ""; }
        else { current += ch; }
      }
    }
    cells.push(current.trim());
    return cells;
  };

  const headers = parseRow(lines[0]).map((h) => h.replace(/^\uFEFF/, ""));
  const rows = lines.slice(1).map((line) => {
    const cells = parseRow(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = cells[i] || ""; });
    return row;
  });

  return { headers, rows };
}
