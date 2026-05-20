# COMPRAS AI — Vidal Golosinas

Asistente inteligente de compras. Subes una foto o consulta escrita y el sistema
identifica el material, devuelve el código SAP (si existe en BD) y propone los
proveedores recomendados por orden de prioridad.

## Qué incluye

- **App Next.js** con UI web (subes foto/texto, ves resultados en streaming).
- **Endpoint plano `/api/n8n/query`** pensado para integraciones (n8n / Telegram).
- **Base de datos** generada desde 4 Excels reales:
  - 5.317 códigos SAP con descripción
  - 22.446 registros de histórico de compras (jun-2025 → abr-2026)
  - 3.561 proveedores del catálogo SAP
  - 35 proveedores habituales enriquecidos con sus marcas (29 del Excel matriz + extra del histórico)
- **Knowledge base** con keywords/marcas/categorías para los 14 proveedores con
  histórico real, usado para puntuar recomendaciones.
- **Workflow n8n** importable que conecta Telegram con el endpoint.

## Estructura del repo

```
COMPRAS/
├── data/                     # JSONs procesados + Excels originales (no se sirven)
│   ├── raw/                  # los 4 .xlsx originales
│   ├── codigos_sap.json
│   ├── proveedores.json
│   ├── proveedores_habituales_enriched.json
│   ├── sap_to_proveedores.json   # SAP -> qué proveedores lo han suministrado
│   ├── proveedor_to_saps.json    # Proveedor -> qué SAPs ha suministrado
│   ├── proveedores_contactos_template.csv  # PARA RELLENAR contactos
│   └── stats.json
├── public/data/              # lo que la app sirve en runtime
│   ├── historico_compras.xlsx
│   ├── codigos_sap.xlsx
│   ├── proveedores_habituales_enriched.json
│   └── sap_to_proveedores.json
├── src/
│   ├── app/
│   │   ├── page.tsx          # UI web
│   │   └── api/
│   │       ├── analyze/      # streaming (UI web)
│   │       └── n8n/query/    # JSON plano (integraciones)
│   └── lib/
│       ├── data-loader.ts        # carga Excel + búsqueda fuzzy
│       ├── search.ts             # combina knowledge + keyword + histórico
│       ├── supplier-knowledge.ts # 14 proveedores con orders > 0 (hardcoded)
│       ├── supplier-directory.ts # 35 proveedores desde JSON (contactos)
│       └── openai.ts             # extracción con GPT-4o
├── scripts/
│   ├── sync-contactos.mjs    # CSV -> JSON enriquecido
│   └── build-knowledge.py    # Excel -> JSONs
└── n8n/
    ├── Compras-workflow.json # workflow importable
    └── README.md             # cómo conectarlo
```

## Setup local

```bash
npm install
echo "OPENAI_API_KEY=sk-..." > .env.local
npm run dev
```

Abre http://localhost:3000

## Deploy en Vercel

1. Sube el repo a GitHub (ya está en `juanky2332-oss/compras`).
2. Importa el repo en https://vercel.com (framework auto-detectado: Next.js).
3. En Settings → Environment Variables añade `OPENAI_API_KEY`.
4. Deploy. La URL pública es la que pondrás como `COMPRAS_API_URL` en n8n.

## Endpoints

### `POST /api/n8n/query` (integraciones)

```json
{
  "text": "rodamiento 6204 2RS",
  "image_base64": "...",
  "image_url": "https://...",
  "max_suppliers": 5,
  "max_sap": 3
}
```

Devuelve JSON con `items[]` (cada uno con `sap_matches[]` y `suppliers[]` ordenados
por prioridad) y un `summary_text` listo para enviar a Telegram en Markdown.

Ver [`n8n/README.md`](n8n/README.md) para detalles.

### `POST /api/analyze` (UI web)

Mismo motor pero con streaming NDJSON. Lo usa la página web.

## Rellenar contactos de proveedores

Los 4 Excel originales **no traían** email/teléfono/web. La estructura está lista
pero esos campos están vacíos. Para rellenarlos:

1. Edita `data/proveedores_contactos_template.csv` (35 filas, una por proveedor).
   Saca los datos de las webs oficiales de cada proveedor habitual.
2. Ejecuta:
   ```bash
   node scripts/sync-contactos.mjs
   ```
3. Commit + push. La próxima respuesta del endpoint incluirá los contactos.

## Integración con n8n + Telegram

Ver [`n8n/README.md`](n8n/README.md).

Resumen:
- Importas `n8n/Compras-workflow.json` en tu instancia de n8n.
- Sustituyes la credencial del bot de Telegram (`TELEGRAM_CRED_ID`).
- Pones la variable de entorno `COMPRAS_API_URL` apuntando a tu deploy de Vercel.
- Activas el workflow → mandas foto o texto al bot → recibes la respuesta con
  proveedor prioritario y código SAP.

## Regenerar los JSONs desde los Excel

Si actualizas los Excel originales:

```bash
# Copia los nuevos .xlsx a data/raw/ y ejecuta:
python3 scripts/build-knowledge.py
```

## Estadísticas actuales (data/stats.json)

```
codigos_sap:               5.317
proveedores_catalogo:      3.561
proveedores_habituales:    29 (Excel matriz) + 14 (histórico) → 35 enriquecidos
compras_historicas:        22.446
codigos_con_historial:     6.427
rango_fechas:              2025-06-02 → 2026-04-30
```
