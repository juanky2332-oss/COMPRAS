import OpenAI from 'openai';

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface ExtractedItem {
  description: string;
  quantity?: string;
  unit?: string;
  reference?: string;
  notes?: string;
}

const SYSTEM_PROMPT = `Eres un asistente experto en compras industriales para Vidal Golosinas en Molina de Segura, España.
Tu tarea es extraer TODOS los materiales, repuestos o artículos mencionados.
Para cada artículo, extrae:
- description: descripción completa del material/artículo (en español)
- quantity: cantidad si aparece
- unit: unidad de medida si aparece (ud, m, kg, L, etc.)
- reference: referencia, código o número de parte si aparece
- notes: detalles técnicos adicionales (medidas, marcas, modelos, especificaciones)

Responde ÚNICAMENTE con un JSON válido en este formato exacto:
{
  "items": [
    {
      "description": "...",
      "quantity": "...",
      "unit": "...",
      "reference": "...",
      "notes": "..."
    }
  ]
}
Si no encuentras artículos, devuelve {"items": []}.
NO inventes artículos que no estén en el contenido proporcionado.`;

function parseItems(content: string): ExtractedItem[] {
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return [];
    const parsed = JSON.parse(jsonMatch[0]);
    return parsed.items || [];
  } catch {
    return [];
  }
}

export async function extractItemsFromImage(
  base64Image: string,
  mimeType: string
): Promise<ExtractedItem[]> {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    max_tokens: 2000,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: {
              url: `data:${mimeType};base64,${base64Image}`,
              detail: 'high',
            },
          },
          {
            type: 'text',
            text: 'Extrae todos los materiales o artículos de compra de esta imagen.',
          },
        ],
      },
    ],
  });

  return parseItems(response.choices[0].message.content || '{"items":[]}');
}

export async function extractItemsFromText(text: string): Promise<ExtractedItem[]> {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    max_tokens: 2000,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: `Extrae todos los materiales o artículos de compra del siguiente texto:\n\n${text}`,
      },
    ],
  });

  return parseItems(response.choices[0].message.content || '{"items":[]}');
}
