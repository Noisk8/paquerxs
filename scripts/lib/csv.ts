import { readFileSync } from 'fs';

export function readCsv(filePath: string): string[][] {
  const text = readFileSync(filePath, 'utf-8');
  return parseCsv(text);
}

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (next === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cell += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        row.push(cell);
        cell = '';
      } else if (char === '\n') {
        row.push(cell);
        if (row.some((c) => c.trim() !== '')) {
          rows.push(row);
        }
        row = [];
        cell = '';
      } else if (char === '\r') {
        if (next === '\n') {
          i++;
        }
        row.push(cell);
        if (row.some((c) => c.trim() !== '')) {
          rows.push(row);
        }
        row = [];
        cell = '';
      } else {
        cell += char;
      }
    }
  }

  if (cell !== '' || row.length > 0) {
    row.push(cell);
    if (row.some((c) => c.trim() !== '')) {
      rows.push(row);
    }
  }

  return rows;
}

export function parseNumber(value: string): number | null {
  if (!value || value.trim() === '') return null;
  const cleaned = value
    .replace(/^\$/, '')
    .replace(/\./g, '')
    .replace(/,/g, '.')
    .trim();
  const num = parseFloat(cleaned);
  return Number.isFinite(num) ? num : null;
}

export function parseInteger(value: string): number | null {
  const num = parseNumber(value);
  return num === null ? null : Math.round(num);
}

export function parseDate(value: string): string | null {
  if (!value || value.trim() === '') return null;
  const parts = value.trim().split(/[\/\\-]/);
  if (parts.length !== 3) return null;

  const [d, m, y] = parts.map((p) => p.trim());
  const dd = d.padStart(2, '0');
  const mm = m.padStart(2, '0');
  const yy = y.length === 2 ? `20${y}` : y;

  if (!/^\d{4}$/.test(yy) || !/^\d{2}$/.test(mm) || !/^\d{2}$/.test(dd)) {
    return null;
  }

  return `${yy}-${mm}-${dd}`;
}

export function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, ' ');
}
