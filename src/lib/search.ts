import {
  searchByDescription,
  searchBySAPCode,
  searchByKeyword,
  getSuppliers,
  extractTokens,
  normalizeText,
  type ScoredRecord,
} from './data-loader';
import { scoreSuppliersByKnowledge, getSupplierKnowledge } from './supplier-knowledge';

export interface SapMatch {
  sapCode: string;
  description: string;
  confidence: 'high' | 'medium' | 'low';
  confidenceLabel: string;
}

export interface SupplierResult {
  code: string;
  name: string;
  frequency: number;
  relevantItems: string[];
  matchReason: string;
}

export interface ItemInput {
  description: string;
  quantity?: string;
  unit?: string;
  reference?: string;
  notes?: string;
  materialType?: string;
}

export interface SapSearchResult {
  sapMatches: SapMatch[];
  searchNote?: string;
  scoredRecords: ScoredRecord[];
}

export interface SupplierSearchResult {
  suppliers: SupplierResult[];
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

function buildSupplierKeywordMap(
  query: string,
  materialType?: string
): Map<string, { hits: number; keywords: string[] }> {
  const map = new Map<string, { hits: number; keywords: string[] }>();

  const queryWords = extractTokens(normalizeText(query))
    .filter(t => t.length >= 4 && !/^\d+$/.test(t));

  const typeWords = materialType
    ? extractTokens(normalizeText(materialType)).filter(t => t.length >= 3 && !/^\d+$/.test(t))
    : [];

  const searchTerms = [...new Set([...queryWords.slice(0, 5), ...typeWords.slice(0, 3)])];

  for (const term of searchTerms) {
    const records = searchByKeyword(term, 80);
    for (const r of records) {
      if (!r.supplierCode) continue;
      if (!map.has(r.supplierCode)) map.set(r.supplierCode, { hits: 0, keywords: [] });
      const entry = map.get(r.supplierCode)!;
      entry.hits++;
      if (!entry.keywords.includes(term)) entry.keywords.push(term);
    }
  }

  return map;
}

/**
 * Task 1: Find SAP codes for the given item.
 * Also returns scoredRecords so Task 2 can reuse the search.
 */
export function findSapMatches(item: ItemInput): SapSearchResult {
  const result: SapSearchResult = { sapMatches: [], scoredRecords: [] };

  // Direct lookup by reference code
  if (item.reference) {
    const byCode = searchBySAPCode(item.reference);
    for (const r of byCode) {
      if (isGenericSapCode(r.sapCode, r.description)) continue;
      if (!result.sapMatches.find(m => m.sapCode === r.sapCode)) {
        result.sapMatches.push({
          sapCode: r.sapCode,
          description: r.description,
          confidence: 'high',
          confidenceLabel: 'Código exacto',
        });
      }
    }
  }

  // Fuzzy scored search
  const query = [item.description, item.notes].filter(Boolean).join(' ');
  if (query) {
    const scored = searchByDescription(query, 40);
    result.scoredRecords = scored;

    const mediumPlus = scored.filter(sr => sr.score >= SCORE_MEDIUM && sr.record.sapCode);
    for (const sr of mediumPlus.slice(0, 6)) {
      if (isGenericSapCode(sr.record.sapCode, sr.record.description)) continue;
      if (!result.sapMatches.find(m => m.sapCode === sr.record.sapCode)) {
        const { confidence, label } = toConfidence(sr.score);
        result.sapMatches.push({
          sapCode: sr.record.sapCode,
          description: sr.record.description,
          confidence,
          confidenceLabel: label,
        });
      }
    }

    // Fallback to low-confidence matches
    if (result.sapMatches.length === 0) {
      const lowMatches = scored.filter(sr => sr.score >= SCORE_POSSIBLE && sr.record.sapCode);
      for (const sr of lowMatches.slice(0, 3)) {
        if (isGenericSapCode(sr.record.sapCode, sr.record.description)) continue;
        if (!result.sapMatches.find(m => m.sapCode === sr.record.sapCode)) {
          result.sapMatches.push({
            sapCode: sr.record.sapCode,
            description: sr.record.description,
            confidence: 'low',
            confidenceLabel: 'Posible — verificar',
          });
        }
      }
      if (result.sapMatches.length > 0) {
        result.searchNote =
          'No se encontró coincidencia exacta. Comprueba que el código corresponde al artículo antes de usarlo.';
      }
    }
  }

  return result;
}

/**
 * Task 2: Find suppliers that can provide the given item.
 * Accepts scoredRecords from findSapMatches to avoid a duplicate search.
 */
export function findSupplierMatches(
  item: ItemInput,
  scoredRecords: ScoredRecord[] = []
): SupplierSearchResult {
  const query = [item.description, item.notes].filter(Boolean).join(' ');
  const knowledgeQuery = [query, item.materialType].filter(Boolean).join(' ');

  // Layer A: keyword expansion across Excel
  const keywordMap = buildSupplierKeywordMap(query, item.materialType);

  // Layer B: direct hits from the scored SAP search
  const directHits = new Map<string, number>();
  for (const sr of scoredRecords) {
    if (!sr.record.supplierCode) continue;
    directHits.set(sr.record.supplierCode, (directHits.get(sr.record.supplierCode) || 0) + 3);
  }

  // Layer C: knowledge base (brand / keyword / category mapping)
  const knowledgeScores = scoreSuppliersByKnowledge(knowledgeQuery);

  // Merge all three sources
  const allCodes = new Set([
    ...keywordMap.keys(),
    ...directHits.keys(),
    ...knowledgeScores.keys(),
  ]);
  const allSuppliers = getSuppliers();

  const ranked: { code: string; score: number; keywords: string[] }[] = [];
  for (const code of Array.from(allCodes)) {
    const kw = keywordMap.get(code);
    const direct = directHits.get(code) || 0;
    const kwScore = kw ? kw.hits * 5 : 0;
    const knowledgeScore = (knowledgeScores.get(code) || 0) * 2;
    ranked.push({ code, score: kwScore + direct + knowledgeScore, keywords: kw?.keywords || [] });
  }

  ranked.sort((a, b) => b.score - a.score);

  const qLower = knowledgeQuery.toLowerCase();
  const suppliers: SupplierResult[] = [];
  const seen = new Set<string>();

  for (const { code, keywords } of ranked) {
    if (seen.has(code)) continue;
    const supplier = allSuppliers.get(code);
    const knowledge = getSupplierKnowledge(code);
    const name = supplier?.name ?? knowledge?.name;
    if (!name) continue;

    let matchReason = '';
    if (knowledge) {
      const matchedBrands = knowledge.brands.filter(b => qLower.includes(b.toLowerCase()));
      const matchedKws = knowledge.keywords.filter(k => qLower.includes(k.toLowerCase()));
      if (matchedBrands.length > 0) {
        matchReason = `Distribuidor: ${matchedBrands.slice(0, 3).join(', ')}`;
      } else if (matchedKws.length > 0) {
        matchReason = `Especialidad: ${matchedKws.slice(0, 3).join(', ')}`;
      } else if (knowledge.speciality) {
        matchReason =
          knowledge.speciality.length > 80
            ? knowledge.speciality.slice(0, 77) + '...'
            : knowledge.speciality;
      }
    }
    if (!matchReason && keywords.length > 0) {
      matchReason = `Suministra: ${keywords.slice(0, 3).join(', ')}`;
    }
    if (!matchReason) matchReason = 'Artículo similar en histórico';

    suppliers.push({
      code: supplier?.code ?? code,
      name,
      frequency: supplier?.frequency ?? 0,
      relevantItems: supplier?.items.slice(0, 4) ?? [],
      matchReason,
    });
    seen.add(code);
    if (suppliers.length >= 5) break;
  }

  return { suppliers };
}
