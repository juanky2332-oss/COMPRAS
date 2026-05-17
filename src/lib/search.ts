import {
  searchByDescription,
  searchBySAPCode,
  searchByKeyword,
  getSuppliers,
  extractTokens,
  normalizeText,
  type PurchaseRecord,
  type ScoredRecord,
} from './data-loader';

export interface SearchResult {
  item: {
    description: string;
    quantity?: string;
    unit?: string;
    reference?: string;
    notes?: string;
    materialType?: string;
  };
  sapMatches: {
    sapCode: string;
    description: string;
    confidence: 'high' | 'medium' | 'low';
    confidenceLabel: string;
  }[];
  suppliers: {
    code: string;
    name: string;
    frequency: number;
    relevantItems: string[];
    matchReason: string;
  }[];
  found: boolean;
  searchNote?: string;
  message?: string;
}

const SCORE_HIGH = 20;
const SCORE_MEDIUM = 9;
const SCORE_POSSIBLE = 2;

function isGenericSapCode(code: string, description: string): boolean {
  if (!code) return false;
  const d = (description || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  if (d.includes('generico') || d.includes('generic') || d.includes('repuesto gen') || d.includes('articulo gen')) return true;
  if (/0{4,}$/.test(code)) return true;
  const digits = code.replace(/\D/g, '');
  if (digits.length >= 8 && (digits.match(/0/g) || []).length / digits.length >= 0.6) return true;
  return false;
}

function toConfidence(score: number): { confidence: 'high' | 'medium' | 'low'; label: string } {
  if (score >= SCORE_HIGH) return { confidence: 'high', label: 'Coincidencia alta' };
  if (score >= SCORE_MEDIUM) return { confidence: 'medium', label: 'Coincidencia probable' };
  return { confidence: 'low', label: 'Posible — verificar' };
}

/**
 * Builds a supplier score map by searching for each individual keyword of the query
 * plus the materialType. A supplier that appears across multiple keyword searches
 * is more likely to carry that type of material.
 *
 * Returns: Map<supplierCode, { hits: number, keywords: string[] }>
 */
function buildSupplierKeywordMap(
  query: string,
  materialType?: string
): Map<string, { hits: number; keywords: string[] }> {
  const map = new Map<string, { hits: number; keywords: string[] }>();

  // Collect search terms: individual meaningful words + materialType words
  const queryWords = extractTokens(normalizeText(query))
    .filter(t => t.length >= 4 && !/^\d+$/.test(t));

  const typeWords = materialType
    ? extractTokens(normalizeText(materialType)).filter(t => t.length >= 3 && !/^\d+$/.test(t))
    : [];

  // Deduplicate search terms
  const searchTerms = [...new Set([...queryWords.slice(0, 5), ...typeWords.slice(0, 3)])];

  for (const term of searchTerms) {
    const records = searchByKeyword(term, 80);
    for (const r of records) {
      if (!r.supplierCode) continue;
      if (!map.has(r.supplierCode)) {
        map.set(r.supplierCode, { hits: 0, keywords: [] });
      }
      const entry = map.get(r.supplierCode)!;
      entry.hits++;
      if (!entry.keywords.includes(term)) entry.keywords.push(term);
    }
  }

  return map;
}

export function findMatches(item: {
  description: string;
  quantity?: string;
  unit?: string;
  reference?: string;
  notes?: string;
  materialType?: string;
}): SearchResult {
  const result: SearchResult = { item, sapMatches: [], suppliers: [], found: false };

  // 1. Direct lookup by SAP/reference code
  if (item.reference) {
    const byCode = searchBySAPCode(item.reference);
    if (byCode.length > 0) {
      for (const r of byCode) {
        if (isGenericSapCode(r.sapCode, r.description)) continue;
        if (!result.sapMatches.find(m => m.sapCode === r.sapCode)) {
          result.sapMatches.push({ sapCode: r.sapCode, description: r.description, confidence: 'high', confidenceLabel: 'Código exacto' });
        }
      }
    }
  }

  // 2. Scored fuzzy search for SAP codes
  const query = [item.description, item.notes].filter(Boolean).join(' ');
  let fullSearchRecords: PurchaseRecord[] = [];

  if (query) {
    const scored: ScoredRecord[] = searchByDescription(query, 40);
    fullSearchRecords = scored.map(sr => sr.record);

    const mediumPlus = scored.filter(sr => sr.score >= SCORE_MEDIUM && sr.record.sapCode);
    for (const sr of mediumPlus.slice(0, 6)) {
      if (isGenericSapCode(sr.record.sapCode, sr.record.description)) continue;
      if (!result.sapMatches.find(m => m.sapCode === sr.record.sapCode)) {
        const { confidence, label } = toConfidence(sr.score);
        result.sapMatches.push({ sapCode: sr.record.sapCode, description: sr.record.description, confidence, confidenceLabel: label });
      }
    }

    // Fallback SAP codes with warning
    if (result.sapMatches.length === 0) {
      const lowMatches = scored.filter(sr => sr.score >= SCORE_POSSIBLE && sr.record.sapCode);
      for (const sr of lowMatches.slice(0, 3)) {
        if (isGenericSapCode(sr.record.sapCode, sr.record.description)) continue;
        if (!result.sapMatches.find(m => m.sapCode === sr.record.sapCode)) {
          result.sapMatches.push({ sapCode: sr.record.sapCode, description: sr.record.description, confidence: 'low', confidenceLabel: 'Posible — verificar' });
        }
      }
      if (result.sapMatches.length > 0) {
        result.searchNote = 'No se encontró coincidencia exacta. Los códigos son aproximados — comprueba que corresponden al artículo antes de usarlos.';
      }
    }
  }

  // 3. Supplier discovery: keyword expansion + materialType
  // Build keyword hit map: suppliers that supply this CATEGORY of material
  const keywordMap = buildSupplierKeywordMap(query, item.materialType);

  // Also add hits from the full scored search (direct relevance)
  const directHits = new Map<string, number>();
  for (const r of fullSearchRecords) {
    if (!r.supplierCode) continue;
    directHits.set(r.supplierCode, (directHits.get(r.supplierCode) || 0) + 3); // direct match worth more
  }

  // Merge: combined score = keyword hits * 5 + direct hits
  const allCodes = new Set([...keywordMap.keys(), ...directHits.keys()]);
  const allSuppliers = getSuppliers();

  const ranked: { code: string; score: number; keywords: string[] }[] = [];
  for (const code of Array.from(allCodes)) {
    const kw = keywordMap.get(code);
    const direct = directHits.get(code) || 0;
    const kwScore = kw ? kw.hits * 5 : 0;
    ranked.push({ code, score: kwScore + direct, keywords: kw?.keywords || [] });
  }

  ranked.sort((a, b) => b.score - a.score);

  const seenSuppliers = new Set<string>();
  for (const { code, keywords } of ranked) {
    if (seenSuppliers.has(code)) continue;
    const supplier = allSuppliers.get(code);
    if (!supplier) continue;

    // Build a human-readable reason
    let matchReason = '';
    if (keywords.length > 0) {
      matchReason = `Suministra: ${keywords.slice(0, 3).join(', ')}`;
    } else {
      matchReason = 'Artículo similar en histórico';
    }

    result.suppliers.push({
      code: supplier.code,
      name: supplier.name,
      frequency: supplier.frequency,
      relevantItems: supplier.items.slice(0, 4),
      matchReason,
    });
    seenSuppliers.add(code);
    if (result.suppliers.length >= 6) break;
  }

  result.found = result.sapMatches.length > 0 || result.suppliers.length > 0;

  if (!result.found) {
    result.message = 'Artículo no encontrado en el histórico. No lo hemos pedido antes con esa descripción. Prueba con palabras clave más cortas o consulta a proveedores industriales de la zona.';
  }

  return result;
}
