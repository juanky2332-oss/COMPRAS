import { NextRequest, NextResponse } from 'next/server';
import { extractItemsFromImage, extractItemsFromText } from '@/lib/openai';
import { findMatches } from '@/lib/search';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const text = formData.get('text') as string | null;

    let items;

    if (text && text.trim().length > 0) {
      items = await extractItemsFromText(text.trim());
    } else if (file) {
      const bytes = await file.arrayBuffer();
      const base64 = Buffer.from(bytes).toString('base64');
      const mimeType = file.type || 'image/jpeg';
      items = await extractItemsFromImage(base64, mimeType);
    } else {
      return NextResponse.json(
        { error: 'Proporciona una imagen o texto para analizar' },
        { status: 400 }
      );
    }

    if (!items || items.length === 0) {
      return NextResponse.json({
        results: [],
        message: text
          ? 'No se pudieron identificar artículos en el texto. Asegúrate de incluir descripciones de materiales.'
          : 'No se pudieron identificar artículos en la imagen. Intenta con una imagen más clara.',
      });
    }

    const results = items.map(item => findMatches(item));
    return NextResponse.json({ results, itemsFound: items.length });
  } catch (error) {
    console.error('Error analyzing:', error);
    const message = error instanceof Error ? error.message : 'Error desconocido';
    return NextResponse.json({ error: `Error al analizar: ${message}` }, { status: 500 });
  }
}
