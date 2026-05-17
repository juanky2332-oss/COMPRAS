import * as XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';

export interface PurchaseRecord {
  sapCode: string;
  description: string;
  supplierCode: string;
  supplierName: string;
  documentDate: string;
  purchaseDoc: string;
}

export interface SupplierSummary {
  code: string;
  name: string;
  items: string[];
  sapCodes: string[];
  frequency: number;
}

let cachedRecords: PurchaseRecord[] | null = null;
let cachedSuppliers: Map<string, SupplierSummary> | null = null;

function parseSupplier(raw: string): { code: string; name: string } {
  if (!raw) return { code: '', name: '' };
  const trimmed = String(raw).trim();
  const match = trimmed.match(/^(\d+)\s+(.+)$/);
  if (match) {
    return { code: match[1].trim(), name: match[2].trim() };
  }
  return { code: '', name: trimmed };
}

function normalizeText(text: string): string {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim();
}

export function loadData(): PurchaseRecord[] {
  if (cachedRecords) return cachedRecords;

  const dataDir = path.join(process.cwd(), 'public', 'data');
  const files = fs.existsSync(dataDir)
    ? fs.readdirSync(dataDir).filter(f => f.endsWith('.xlsx') || f.endsWith('.xls'))
    : [];

  if (files.length === 0) {
    cachedRecords = [];
    return [];
  }

  const records: PurchaseRecord[] = [];

  for (const file of files) {
    const wb = XLSX.readFile(path.join(dataDir, file));
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, string>>(ws, {
      defval: '',
      raw: false,
    });

    for (const row of rows) {
      const sapCode = String(row['Código SAP/ Material'] || row['Codigo SAP/ Material'] || row['Material'] || '').trim();
      const description = String(row['Texto breve'] || '').trim();
      const supplierRaw = String(row['Proveedor/Centro suministrador'] || '').trim();
      const { code: supplierCode, name: supplierName } = parseSupplier(supplierRaw);
      const documentDate = String(row['Fecha documento'] || '').trim();
      const purchaseDoc = String(row['Documento compras'] || '').trim();

      if (!sapCode && !description) continue;

      records.push({ sapCode, description, supplierCode, supplierName, documentDate, purchaseDoc });
    }
  }

  cachedRecords = records;
  buildSupplierIndex(records);
  return records;
}

function buildSupplierIndex(records: PurchaseRecord[]) {
  const map = new Map<string, SupplierSummary>();

  for (const r of records) {
    if (!r.supplierCode) continue;
    if (!map.has(r.supplierCode)) {
      map.set(r.supplierCode, {
        code: r.supplierCode,
        name: r.supplierName,
        items: [],
        sapCodes: [],
        frequency: 0,
      });
    }
    const s = map.get(r.supplierCode)!;
    s.frequency++;
    if (r.description && !s.items.includes(r.description)) s.items.push(r.description);
    if (r.sapCode && !s.sapCodes.includes(r.sapCode)) s.sapCodes.push(r.sapCode);
  }

  cachedSuppliers = map;
}

export function getSuppliers(): Map<string, SupplierSummary> {
  if (!cachedSuppliers) {
    const records = loadData();
    buildSupplierIndex(records);
  }
  return cachedSuppliers || new Map();
}

export function searchByDescription(query: string, limit = 5): PurchaseRecord[] {
  const records = loadData();
  const normalizedQuery = normalizeText(query);
  const queryWords = normalizedQuery.split(/\s+/).filter(w => w.length > 2);

  if (queryWords.length === 0) return [];

  const scored: { record: PurchaseRecord; score: number }[] = [];

  for (const record of records) {
    if (!record.description) continue;
    const normalizedDesc = normalizeText(record.description);
    let score = 0;

    for (const word of queryWords) {
      if (normalizedDesc.includes(word)) score += 2;
    }

    const queryLen = queryWords.length;
    const matchedWords = queryWords.filter(w => normalizedDesc.includes(w)).length;
    score += (matchedWords / queryLen) * 3;

    if (normalizedDesc === normalizedQuery) score += 10;

    if (score > 0) scored.push({ record, score });
  }

  scored.sort((a, b) => b.score - a.score);

  const seen = new Set<string>();
  const results: PurchaseRecord[] = [];
  for (const { record } of scored) {
    const key = `${record.sapCode}-${record.supplierCode}`;
    if (!seen.has(key)) {
      seen.add(key);
      results.push(record);
      if (results.length >= limit) break;
    }
  }

  return results;
}

export function searchBySAPCode(code: string): PurchaseRecord[] {
  const records = loadData();
  const normalizedCode = code.trim().toUpperCase();
  return records.filter(r => r.sapCode.toUpperCase() === normalizedCode);
}
