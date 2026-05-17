import {
  searchByDescription,
  searchBySAPCode,
  getSuppliers,
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
  }[];
  found: boolean;
  searchNote?: string;
  message?: string;
}

// Score thresholds → confidence levels
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

export function findMatches(item: {
  description: string;
  quantity?: string;
  unit?: string;
  reference?: string;
  notes?: string;
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
      collectSuppliers(result, byCode);
    }
  }

  // 2. Scored fuzzy search by description + notes
  const query = [item.description, item.notes].filter(Boolean).join(' ');
  if (query) {
    const scored = searchByDescription(query, 40);

    // SAP codes: only medium+ confidence in main list
    const mediumPlus = scored.filter(sr => sr.score >= SCORE_MEDIUM && sr.record.sapCode);
    for (const sr of mediumPlus.slice(0, 6)) {
      if (isGenericSapCode(sr.record.sapCode, sr.record.description)) continue;
      if (!result.sapMatches.find(m => m.sapCode === sr.record.sapCode)) {
        const { confidence, label } = toConfidence(sr.score);
        result.sapMatches.push({ sapCode: sr.record.sapCode, description: sr.record.description, confidence, confidenceLabel: label });
      }
    }

    // Suppliers: collect from ALL scored records (even low score means possible supplier)
    collectSuppliers(result, scored.map(sr => sr.record));

    // Fallback SAP: if still no codes, show best low-score matches with a warning
    if (result.sapMatches.length === 0) {
      const lowMatches = scored.filter(sr => sr.score >= SCORE_POSSIBLE && sr.record.sapCode);
      for (const sr of lowMatches.slice(0, 3)) {
        if (isGenericSapCode(sr.record.sapCode, sr.record.description)) continue;
        if (!result.sapMatches.find(m => m.sapCode === sr.record.sapCode)) {
          result.sapMatches.push({ sapCode: sr.record.sapCode, description: sr.record.description, confidence: 'low', confidenceLabel: 'Posible — verificar' });
        }
      }
      if (result.sapMatches.length > 0) {
        result.searchNote = 'No se encontró coincidencia exacta. Los códigos mostrados son aproximados. Comprueba que el artículo coincide antes de usarlos.';
      }
    }
  }

  result.found = result.sapMatches.length > 0 || result.suppliers.length > 0;

  if (!result.found) {
    result.message = 'Artículo no encontrado en el histórico. No lo hemos pedido antes o tiene una descripción muy distinta. Prueba con palabras clave diferentes o consulta a los proveedores industriales de la zona.';
  }

  return result;
}

function collectSuppliers(result: SearchResult, records: PurchaseRecord[]) {
  const allSuppliers = getSuppliers();
  const seen = new Set(result.suppliers.map(s => s.code));

  // Rank suppliers by how many times they appear in the matched records
  const hits = new Map<string, number>();
  for (const r of records) {
    if (!r.supplierCode) continue;
    hits.set(r.supplierCode, (hits.get(r.supplierCode) || 0) + 1);
  }

  const ranked = Array.from(hits.entries()).sort((a, b) => b[1] - a[1]);

  for (const [code] of ranked) {
    if (seen.has(code)) continue;
    const supplier = allSuppliers.get(code);
    if (!supplier) continue;
    result.suppliers.push({
      code: supplier.code,
      name: supplier.name,
      frequency: supplier.frequency,
      relevantItems: supplier.items.slice(0, 4),
    });
    seen.add(code);
    if (result.suppliers.length >= 6) break;
  }
}
