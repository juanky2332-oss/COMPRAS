import { NextRequest, NextResponse } from 'next/server';
import { extractItemsFromImage } from '@/lib/openai';
import { findMatches } from '@/lib/search';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No se proporcionó archivo' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = buffer.toString('base64');
    const mimeType = file.type || 'image/jpeg';

    // Extract items from image using GPT-4 Vision
    const items = await extractItemsFromImage(base64, mimeType);

    if (items.length === 0) {
      return NextResponse.json({
        results: [],
        message: 'No se pudieron identificar artículos en la imagen. Intenta con una imagen más clara.',
      });
    }

    // Search for each item in the database
    const results = items.map(item => findMatches(item));

    return NextResponse.json({ results, itemsFound: items.length });
  } catch (error) {
    console.error('Error analyzing image:', error);
    const message = error instanceof Error ? error.message : 'Error desconocido';
    return NextResponse.json({ error: `Error al analizar: ${message}` }, { status: 500 });
  }
}
