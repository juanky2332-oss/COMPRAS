import { searchByDescription, searchBySAPCode, getSuppliers, type PurchaseRecord } from './data-loader';

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
  }[];
  suppliers: {
    code: string;
    name: string;
    frequency: number;
    relevantItems: string[];
  }[];
  found: boolean;
  message?: string;
}

// Codes ending in 4+ zeros, majority-zero codes, or "repuesto generico" descriptions
function isGenericSapCode(code: string, description: string): boolean {
  if (!code) return false;

  const descLower = description.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  if (
    descLower.includes('generico') ||
    descLower.includes('generic') ||
    descLower.includes('repuesto gen') ||
    descLower.includes('articulo gen')
  ) return true;

  // Ends in 4 or more consecutive zeros
  if (/0{4,}$/.test(code)) return true;

  // Code like 000000000599000000 — more than 60% zeros in a long code
  const digitsOnly = code.replace(/\D/g, '');
  if (digitsOnly.length >= 8) {
    const zeroCount = (digitsOnly.match(/0/g) || []).length;
    if (zeroCount / digitsOnly.length >= 0.6) return true;
  }

  return false;
}

export function findMatches(item: {
  description: string;
  quantity?: string;
  unit?: string;
  reference?: string;
  notes?: string;
}): SearchResult {
  const results: SearchResult = {
    item,
    sapMatches: [],
    suppliers: [],
    found: false,
  };

  if (item.reference) {
    const byCode = searchBySAPCode(item.reference);
    if (byCode.length > 0) {
      addSapMatches(results, byCode, 'high');
      addSuppliers(results, byCode);
    }
  }

  const searchQuery = [item.description, item.notes].filter(Boolean).join(' ');
  if (searchQuery) {
    const byDesc = searchByDescription(searchQuery, 8);
    if (byDesc.length > 0) {
      const confidence = results.sapMatches.length > 0 ? 'medium' : 'high';
      addSapMatches(results, byDesc, confidence);
      addSuppliers(results, byDesc);
    }
  }

  results.found = results.sapMatches.length > 0 || results.suppliers.length > 0;

  if (!results.found) {
    results.message =
      'No se ha encontrado este artículo en la base de datos. Se recomienda consultar directamente con proveedores de la zona de Molina de Segura.';
  }

  return results;
}

function addSapMatches(
  results: SearchResult,
  records: PurchaseRecord[],
  confidence: 'high' | 'medium' | 'low'
) {
  const seen = new Set(results.sapMatches.map(m => m.sapCode));
  for (const r of records) {
    if (!r.sapCode || seen.has(r.sapCode)) continue;
    // Skip generic/placeholder codes
    if (isGenericSapCode(r.sapCode, r.description)) continue;
    results.sapMatches.push({ sapCode: r.sapCode, description: r.description, confidence });
    seen.add(r.sapCode);
  }
}

function addSuppliers(results: SearchResult, records: PurchaseRecord[]) {
  const allSuppliers = getSuppliers();
  const supplierCodes = new Set(records.map(r => r.supplierCode).filter(Boolean));
  const seen = new Set(results.suppliers.map(s => s.code));

  for (const code of Array.from(supplierCodes)) {
    if (seen.has(code)) continue;
    const supplier = allSuppliers.get(code);
    if (!supplier) continue;
    results.suppliers.push({
      code: supplier.code,
      name: supplier.name,
      frequency: supplier.frequency,
      relevantItems: supplier.items.slice(0, 5),
    });
    seen.add(code);
  }

  results.suppliers.sort((a, b) => b.frequency - a.frequency);
  results.suppliers = results.suppliers.slice(0, 5);
}
