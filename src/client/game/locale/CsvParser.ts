/**
 * RFC 4180 CSV parser.
 *
 * Edge cases covered:
 * - Quoted fields with commas: `"a,b",c`
 * - Escaped quotes: `"say ""hi"""`
 * - Newlines inside quotes: `"line1\nline2"`
 * - Literal \\n after parse via unescapeCell()
 * - UTF-8 BOM strip
 * - CRLF / LF / CR line endings
 */

export function unescapeCell(value: string): string {
  let out = '';
  for (let i = 0; i < value.length; i++) {
    const ch = value[i];
    if (ch === '\\' && i + 1 < value.length) {
      const next = value[i + 1];
      if (next === 'n') {
        out += '\n';
        i += 1;
        continue;
      }
      if (next === 'r') {
        out += '\r';
        i += 1;
        continue;
      }
      if (next === 't') {
        out += '\t';
        i += 1;
        continue;
      }
      if (next === '"') {
        out += '"';
        i += 1;
        continue;
      }
      if (next === '\\') {
        out += '\\';
        i += 1;
        continue;
      }
    }
    out += ch;
  }
  return out;
}

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  let i = 0;

  const src = text.replace(/^\uFEFF/, '');

  while (i < src.length) {
    const ch = src[i];

    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      field += ch;
      i += 1;
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }

    if (ch === ',') {
      row.push(unescapeCell(field));
      field = '';
      i += 1;
      continue;
    }

    if (ch === '\r') {
      row.push(unescapeCell(field));
      field = '';
      if (row.some((cell) => cell.length > 0)) {
        rows.push(row);
      }
      row = [];
      if (src[i + 1] === '\n') i += 2;
      else i += 1;
      continue;
    }

    if (ch === '\n') {
      row.push(unescapeCell(field));
      field = '';
      if (row.some((cell) => cell.length > 0)) {
        rows.push(row);
      }
      row = [];
      i += 1;
      continue;
    }

    field += ch;
    i += 1;
  }

  row.push(unescapeCell(field));
  if (row.some((cell) => cell.length > 0)) {
    rows.push(row);
  }

  return rows;
}

export type LocaleCsvRow = {
  key: string;
  ko: string;
  en: string;
};

/** Parse locale CSV with header `key,ko,en`. */
export function parseLocaleCsv(text: string): LocaleCsvRow[] {
  const rows = parseCsv(text);
  if (rows.length === 0) return [];

  const header = rows[0]!.map((h) => h.trim().toLowerCase());
  const keyIdx = header.indexOf('key');
  const koIdx = header.indexOf('ko');
  const enIdx = header.indexOf('en');

  if (keyIdx === -1 || koIdx === -1 || enIdx === -1) {
    throw new Error('Locale CSV must have header: key,ko,en');
  }

  const result: LocaleCsvRow[] = [];
  for (let r = 1; r < rows.length; r++) {
    const cells = rows[r]!;
    const key = (cells[keyIdx] ?? '').trim();
    if (!key) continue;
    result.push({
      key,
      ko: cells[koIdx] ?? '',
      en: cells[enIdx] ?? '',
    });
  }

  return result;
}
