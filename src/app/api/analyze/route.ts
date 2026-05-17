import { NextRequest } from 'next/server';
import { extractItemsFromImage, extractItemsFromText } from '@/lib/openai';
import { findSapMatches, findSupplierMatches } from '@/lib/search';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  const text = formData.get('text') as string | null;

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(encoder.encode(JSON.stringify(data) + '\n'));
      };

      try {
        if (!text?.trim() && !file) {
          send({ type: 'error', message: 'Proporciona una imagen o texto para analizar.' });
          controller.close();
          return;
        }

        // Step 1: extract items from GPT
        send({ type: 'extracting' });

        let items;
        if (text && text.trim().length > 0) {
          items = await extractItemsFromText(text.trim());
        } else {
          const bytes = await file!.arrayBuffer();
          const base64 = Buffer.from(bytes).toString('base64');
          const mimeType = file!.type || 'image/jpeg';
          items = await extractItemsFromImage(base64, mimeType);
        }

        if (!items || items.length === 0) {
          send({
            type: 'error',
            message: text?.trim()
              ? 'No se identificaron artículos en el texto. Prueba con descripciones más concretas.'
              : 'No se identificaron artículos en la imagen. Prueba con una imagen más nítida.',
          });
          controller.close();
          return;
        }

        send({ type: 'start', total: items.length });

        // Step 2: for each item, run the two searches and stream results
        for (let i = 0; i < items.length; i++) {
          const item = items[i];

          // Announce the item immediately
          send({ type: 'item', index: i, item });

          // Task 1: SAP codes
          const sapResult = findSapMatches(item);
          send({
            type: 'sap',
            index: i,
            sapMatches: sapResult.sapMatches,
            searchNote: sapResult.searchNote,
          });

          // Task 2: Suppliers (reuses scored records from SAP search)
          const supplierResult = findSupplierMatches(item, sapResult.scoredRecords);
          send({
            type: 'supplier',
            index: i,
            suppliers: supplierResult.suppliers,
          });
        }

        send({ type: 'done' });
      } catch (e) {
        console.error('Stream error:', e);
        send({ type: 'error', message: e instanceof Error ? e.message : 'Error desconocido' });
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson',
      'Cache-Control': 'no-cache',
      'X-Accel-Buffering': 'no',
    },
  });
}
