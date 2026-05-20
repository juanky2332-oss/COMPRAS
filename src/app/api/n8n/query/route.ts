import { NextRequest, NextResponse } from 'next/server';
import { extractItemsFromImage, extractItemsFromText, type ExtractedItem } from '@/lib/openai';
import { findSapMatches, findSupplierMatches } from '@/lib/search';
import { findSupplierInDirectory } from '@/lib/supplier-directory';
import { getSupplierKnowledge } from '@/lib/supplier-knowledge';

export const runtime = 'nodejs';
export const maxDuration = 60;

interface N8nRequest {
  text?: string;
  image_base64?: string;
  image_mime?: string;
  image_url?: string;
  max_suppliers?: number;
  max_sap?: number;
}

interface N8nSupplier {
  priority: number;
  id_sap: string | null;
  nombre: string;
  nombre_corto: string;
  email: string;
  telefono: string;
  web_oficial: string;
  actividad: string;
  marcas_relevantes: string[];
  compras_historicas: number;
  match_reason: string;
  in_history: boolean;
}

interface N8nSapMatch {
  codigo_sap: string;
  descripcion: string;
  confidence: 'high' | 'medium' | 'low';
  confidence_label: string;
}

interface N8nItemResult {
  description: string;
  reference?: string;
  notes?: string;
  material_type?: string;
  sap_matches: N8nSapMatch[];
  sap_note?: string;
  suppliers: N8nSupplier[];
}

interface N8nResponse {
  ok: boolean;
  error?: string;
  items: N8nItemResult[];
  summary_text: string;
}

async function fetchImageAsBase64(url: string): Promise<{ base64: string; mime: string }> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`No se pudo descargar la imagen (${r.status})`);
  const buf = Buffer.from(await r.arrayBuffer());
  const mime = r.headers.get('content-type') || 'image/jpeg';
  return { base64: buf.toString('base64'), mime };
}

function buildSummary(items: N8nItemResult[]): string {
  if (items.length === 0) return 'No se han identificado materiales en la consulta.';

  const lines: string[] = [];
  items.forEach((it, idx) => {
    lines.push(`*${idx + 1}. ${it.description}*`);
    if (it.reference) lines.push(`   Ref: ${it.reference}`);

    if (it.sap_matches.length > 0) {
      const best = it.sap_matches[0];
      lines.push(`   SAP: \`${best.codigo_sap}\` — ${best.descripcion}  _(${best.confidence_label})_`);
      if (it.sap_matches.length > 1) {
        lines.push(`   Otros SAP: ${it.sap_matches.slice(1, 3).map(m => '`' + m.codigo_sap + '`').join(', ')}`);
      }
    } else {
      lines.push('   SAP: _sin coincidencia clara — revisar manualmente_');
    }

    if (it.suppliers.length > 0) {
      lines.push('   Proveedores recomendados:');
      it.suppliers.slice(0, 3).forEach(s => {
        const contact: string[] = [];
        if (s.telefono) contact.push(`📞 ${s.telefono}`);
        if (s.email) contact.push(`✉️ ${s.email}`);
        lines.push(`     ${s.priority}. *${s.nombre_corto}* — ${s.match_reason}`);
        if (contact.length > 0) lines.push(`        ${contact.join('   ')}`);
        if (s.compras_historicas > 0) lines.push(`        Histórico: ${s.compras_historicas} compras`);
      });
    } else {
      lines.push('   _Sin proveedor recomendado en BD — buscar fuera del catálogo habitual_');
    }
    lines.push('');
  });

  return lines.join('\n').trim();
}

function enrichSupplier(
  priority: number,
  code: string,
  name: string,
  matchReason: string,
  frequency: number,
): N8nSupplier {
  const dir = findSupplierInDirectory({ id_sap: code, nombre: name });
  const knowledge = getSupplierKnowledge(code);
  return {
    priority,
    id_sap: dir?.id_sap ?? code ?? null,
    nombre: dir?.nombre_oficial ?? name,
    nombre_corto: dir?.nombre_corto ?? knowledge?.shortName ?? name,
    email: dir?.email ?? '',
    telefono: dir?.telefono ?? '',
    web_oficial: dir?.web_oficial ?? '',
    actividad: dir?.actividad ?? knowledge?.speciality ?? '',
    marcas_relevantes: dir?.marcas?.slice(0, 8) ?? knowledge?.brands?.slice(0, 8) ?? [],
    compras_historicas: dir?.compras_historicas ?? frequency ?? 0,
    match_reason: matchReason,
    in_history: dir?.tiene_historial ?? frequency > 0,
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as N8nRequest;
    const maxSup = Math.min(Math.max(body.max_suppliers ?? 5, 1), 10);
    const maxSap = Math.min(Math.max(body.max_sap ?? 3, 1), 10);

    if (!body.text?.trim() && !body.image_base64 && !body.image_url) {
      return NextResponse.json<N8nResponse>(
        { ok: false, error: 'Falta text, image_base64 o image_url', items: [], summary_text: '' },
        { status: 400 },
      );
    }

    // 1. Extracción de items
    let items: ExtractedItem[] = [];
    if (body.text?.trim()) {
      items = await extractItemsFromText(body.text.trim());
    } else if (body.image_base64) {
      items = await extractItemsFromImage(body.image_base64, body.image_mime || 'image/jpeg');
    } else if (body.image_url) {
      const { base64, mime } = await fetchImageAsBase64(body.image_url);
      items = await extractItemsFromImage(base64, mime);
    }

    if (!items || items.length === 0) {
      const resp: N8nResponse = {
        ok: true,
        items: [],
        summary_text: 'No se han identificado artículos en la consulta. Prueba con descripciones más concretas o una imagen más nítida.',
      };
      return NextResponse.json(resp);
    }

    // 2. Por cada item: SAP + suppliers
    const results: N8nItemResult[] = [];
    for (const item of items) {
      const sapResult = findSapMatches(item);
      const supplierResult = findSupplierMatches(item, sapResult.scoredRecords);

      const itemResult: N8nItemResult = {
        description: item.description,
        reference: item.reference,
        notes: item.notes,
        material_type: item.materialType,
        sap_matches: sapResult.sapMatches.slice(0, maxSap).map(m => ({
          codigo_sap: m.sapCode,
          descripcion: m.description,
          confidence: m.confidence,
          confidence_label: m.confidenceLabel,
        })),
        sap_note: sapResult.searchNote,
        suppliers: supplierResult.suppliers.slice(0, maxSup).map((s, idx) =>
          enrichSupplier(idx + 1, s.code, s.name, s.matchReason, s.frequency),
        ),
      };
      results.push(itemResult);
    }

    const resp: N8nResponse = {
      ok: true,
      items: results,
      summary_text: buildSummary(results),
    };
    return NextResponse.json(resp);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error desconocido';
    console.error('[n8n/query]', e);
    return NextResponse.json<N8nResponse>(
      { ok: false, error: msg, items: [], summary_text: '' },
      { status: 500 },
    );
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    endpoint: '/api/n8n/query',
    method: 'POST',
    body: {
      text: 'string (opcional) — consulta escrita',
      image_base64: 'string (opcional) — imagen en base64',
      image_mime: 'string (opcional) — mime de la imagen, default image/jpeg',
      image_url: 'string (opcional) — URL pública de la imagen',
      max_suppliers: 'number (opcional, default 5)',
      max_sap: 'number (opcional, default 3)',
    },
    response_shape: {
      ok: 'boolean',
      items: '[{ description, sap_matches[], suppliers[] }]',
      summary_text: 'string (markdown listo para Telegram)',
    },
  });
}
