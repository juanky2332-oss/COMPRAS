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

export interface ScoredRecord {
  record: PurchaseRecord;
  score: number;
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
  if (match) return { code: match[1].trim(), name: match[2].trim() };
  return { code: '', name: trimmed };
}

export function normalizeText(text: string): string {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[áàäâ]/g, 'a')
    .replace(/[éèëê]/g, 'e')
    .replace(/[íìïî]/g, 'i')
    .replace(/[óòöô]/g, 'o')
    .replace(/[úùüû]/g, 'u')
    .replace(/ñ/g, 'n')
    .trim();
}

export function extractTokens(text: string): string[] {
  const tokens = new Set<string>();
  const normalized = normalizeText(text);
  const chunks = normalized.split(/[\s,;:()\[\]{}"']+/).filter(Boolean);

  for (const chunk of chunks) {
    if (!chunk || chunk.length < 2) continue;
    tokens.add(chunk);

    const parts = chunk.split(/[-_.\/x×*]+/);
    for (const part of parts) {
      if (part.length >= 2 && part !== chunk) tokens.add(part);
    }

    const nums = chunk.match(/\d+/g) || [];
    for (const n of nums) {
      if (n.length >= 2) tokens.add(n);
    }
  }

  return Array.from(tokens);
}

function scoreRecord(queryTokens: string[], desc: string): number {
  if (!desc) return 0;
  const normalizedDesc = normalizeText(desc);
  const descTokens = extractTokens(normalizedDesc);

  const queryNumbers = queryTokens.filter(t => /^\d+$/.test(t));
  const queryWords = queryTokens.filter(t => !/^\d+$/.test(t) && t.length >= 2);

  let score = 0;
  let exactMatches = 0;
  const totalMeaningful = queryNumbers.length + queryWords.length;

  for (const num of queryNumbers) {
    if (normalizedDesc.includes(num)) {
      score += num.length >= 5 ? 14 : num.length >= 4 ? 10 : 7;
      exactMatches++;
    } else {
      for (const dt of descTokens) {
        if (/^\d+$/.test(dt) && dt.length >= 2) {
          if (dt.startsWith(num) || num.startsWith(dt)) score += 3;
        }
      }
    }
  }

  for (const word of queryWords) {
    if (normalizedDesc.includes(word)) {
      score += word.length >= 7 ? 6 : word.length >= 5 ? 4 : 2;
      exactMatches++;
    } else {
      for (const dt of descTokens) {
        if (dt.length >= 4 && word.length >= 4) {
          if (dt.includes(word) || word.includes(dt)) score += 1;
        }
      }
    }
  }

  if (totalMeaningful > 0 && exactMatches > 0) {
    score += (exactMatches / totalMeaningful) * 10;
  }

  if (normalizedDesc === normalizeText(queryTokens.join(' '))) score += 25;

  return score;
}

type CompactRecord = { s: string; d: string; c: string; n: string; f: string; p: string };

export function loadData(): PurchaseRecord[] {
  if (cachedRecords) return cachedRecords;

  const compactFile = path.join(process.cwd(), 'public', 'data', 'historico_compact.json');
  if (!fs.existsSync(compactFile)) {
    cachedRecords = [];
    return [];
  }

  const compact: CompactRecord[] = JSON.parse(fs.readFileSync(compactFile, 'utf-8'));
  const records: PurchaseRecord[] = compact.map(r => ({
    sapCode: r.s,
    description: r.d,
    supplierCode: r.c,
    supplierName: r.n,
    documentDate: r.f,
    purchaseDoc: r.p,
  }));

  cachedRecords = records;
  buildSupplierIndex(records);
  return records;
}

// Mantenido para futura compatibilidad si se quisiera volver a leer .xlsx en runtime.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function _parseSupplierLegacy(raw: string) {
  return parseSupplier(raw);
}

function buildSupplierIndex(records: PurchaseRecord[]) {
  const map = new Map<string, SupplierSummary>();

  for (const r of records) {
    if (!r.supplierCode) continue;
    if (!map.has(r.supplierCode)) {
      map.set(r.supplierCode, { code: r.supplierCode, name: r.supplierName, items: [], sapCodes: [], frequency: 0 });
    }
    const s = map.get(r.supplierCode)!;
    s.frequency++;
    if (r.description && !s.items.includes(r.description)) s.items.push(r.description);
    if (r.sapCode && !s.sapCodes.includes(r.sapCode)) s.sapCodes.push(r.sapCode);
  }

  cachedSuppliers = map;
}

export function getSuppliers(): Map<string, SupplierSummary> {
  if (!cachedSuppliers) { loadData(); }
  return cachedSuppliers || new Map();
}

export function searchByDescription(query: string, limit = 40): ScoredRecord[] {
  const records = loadData();
  const queryTokens = extractTokens(normalizeText(query)).filter(t => t.length >= 2);
  if (queryTokens.length === 0) return [];

  const scored: ScoredRecord[] = [];
  for (const record of records) {
    const score = scoreRecord(queryTokens, record.description);
    if (score >= 2) scored.push({ record, score });
  }

  scored.sort((a, b) => b.score - a.score);

  const seen = new Set<string>();
  const results: ScoredRecord[] = [];
  for (const sr of scored) {
    const key = `${sr.record.sapCode}||${sr.record.supplierCode}`;
    if (!seen.has(key)) {
      seen.add(key);
      results.push(sr);
      if (results.length >= limit) break;
    }
  }

  return results;
}

/**
 * Broad single-keyword search: returns all records whose description contains `keyword`.
 * Used for category-based supplier discovery ("rodamiento", "electrico", "hidraulica"…).
 * No score threshold — if the word is there, the supplier might have that type of material.
 */
export function searchByKeyword(keyword: string, limit = 60): PurchaseRecord[] {
  const records = loadData();
  const norm = normalizeText(keyword);
  if (norm.length < 3) return [];

  const matches: PurchaseRecord[] = [];
  const seen = new Set<string>();

  for (const record of records) {
    if (!record.description || !record.supplierCode) continue;
    if (normalizeText(record.description).includes(norm)) {
      const key = `${record.sapCode}||${record.supplierCode}`;
      if (!seen.has(key)) {
        seen.add(key);
        matches.push(record);
        if (matches.length >= limit) break;
      }
    }
  }

  return matches;
}

export function searchBySAPCode(code: string): PurchaseRecord[] {
  const records = loadData();
  const norm = code.trim().toUpperCase();
  return records.filter(r => r.sapCode.toUpperCase() === norm);
}
