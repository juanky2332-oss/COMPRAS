# Integración n8n — Compras Vidal

Workflow listo para importar en n8n que conecta Telegram con la API de compras.

## Flujo

```
Telegram Trigger
    │
    ▼
Switch: ¿foto o texto?
    │
    ├──► (foto)   Telegram: descargar foto ──► POST /api/n8n/query (image_base64)
    │
    └──► (texto)                              POST /api/n8n/query (text)
                                                       │
                                                       ▼
                                              Merge respuestas
                                                       │
                                                       ▼
                                       Telegram: responder al chat
```

## Importar el workflow

1. En el panel de n8n: **Workflows → Import from File**
2. Sube `n8n/Compras-workflow.json`
3. Edita las credenciales: en cada nodo Telegram, sustituye `TELEGRAM_CRED_ID`
   por la credencial real (creada con el token de tu BotFather)
4. Variable de entorno (en Settings → Environment Variables del n8n):
   - `COMPRAS_API_URL` = `https://tu-app-compras.vercel.app` (sin barra final)

## Endpoint API que consume

`POST {COMPRAS_API_URL}/api/n8n/query`

**Body JSON:**
```json
{
  "text": "necesito 2 rodamientos 6204 2RS para motor extrusora",
  "image_base64": "...",      // alternativo
  "image_mime": "image/jpeg",
  "image_url": "https://...", // alternativo si la imagen es pública
  "max_suppliers": 5,
  "max_sap": 3
}
```

**Respuesta:**
```json
{
  "ok": true,
  "items": [
    {
      "description": "Rodamiento 6204 2RS",
      "sap_matches": [
        { "codigo_sap": "5020XXXXX", "descripcion": "...", "confidence": "high", "confidence_label": "Coincidencia alta" }
      ],
      "suppliers": [
        {
          "priority": 1,
          "id_sap": "100025419",
          "nombre": "ESGAS ACCESORIOS,SL.",
          "nombre_corto": "ESGAS",
          "email": "",
          "telefono": "",
          "actividad": "Especialista en rodamientos (SKF, FAG, NTN, ZKL)",
          "marcas_relevantes": ["SKF", "FAG", "NTN"],
          "compras_historicas": 1359,
          "match_reason": "Distribuidor: SKF, FAG, NTN",
          "in_history": true
        }
      ]
    }
  ],
  "summary_text": "*1. Rodamiento 6204 2RS*\n   SAP: `5020XXXXX` — ...\n   Proveedores recomendados:\n     1. *ESGAS* — Distribuidor: SKF, FAG, NTN\n        Histórico: 1359 compras\n..."
}
```

El campo `summary_text` ya viene formateado en Markdown listo para enviar a Telegram.

## Probar la API sin n8n (curl)

```bash
curl -X POST https://tu-app-compras.vercel.app/api/n8n/query \
  -H "Content-Type: application/json" \
  -d '{"text":"necesito disco de láminas 115x22 grano 60"}'
```

## Rellenar los contactos de proveedores

La API ya devuelve `email`, `telefono`, `web_oficial`, `actividad` por proveedor, pero
están vacíos por defecto (los Excel no traían esa información).

Para rellenarlos:

1. Edita `data/proveedores_contactos_template.csv` con los datos reales
   (puedes sacar emails/teléfonos de las webs oficiales de cada proveedor habitual).
2. Ejecuta: `node scripts/sync-contactos.mjs`
3. Commit + push. La próxima respuesta del API ya incluirá esos datos.

## Variables de entorno necesarias en la app

- `OPENAI_API_KEY` — para extracción de items con GPT-4o (visión + texto)

## Notas

- El workflow no es ejecutable hasta que sustituyas el placeholder de credenciales.
- Si el bot recibe un mensaje sin foto ni texto, no se ejecutará ninguna rama (es el fallback “none” del Switch).
- El campo `caption` de la foto se envía como `text` adicional al endpoint — útil para añadir contexto a la imagen ("rodamiento del motor 4").
