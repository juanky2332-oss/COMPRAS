#!/usr/bin/env bash
# Sube n8n/Compras-workflow.json a tu instancia de n8n via API.
# Uso (desde la raíz del repo):
#   N8N_URL=https://paneln8n.transformaconia.com \
#   N8N_API_KEY=tu_api_key \
#   bash scripts/upload-workflow-n8n.sh
#
# La API key se genera en n8n: Settings -> API -> Create an API key.

set -euo pipefail

: "${N8N_URL:?Falta N8N_URL (ej: https://paneln8n.transformaconia.com)}"
: "${N8N_API_KEY:?Falta N8N_API_KEY (genera una en n8n: Settings -> API)}"

WORKFLOW_FILE="n8n/Compras-workflow.json"
[[ -f "$WORKFLOW_FILE" ]] || { echo "No encuentro $WORKFLOW_FILE"; exit 1; }

# n8n /api/v1/workflows acepta name, nodes, connections, settings
PAYLOAD=$(jq '{
  name: .name,
  nodes: .nodes,
  connections: .connections,
  settings: (.settings // {executionOrder: "v1"})
}' "$WORKFLOW_FILE")

RESPONSE=$(curl -sS -X POST \
  -H "X-N8N-API-KEY: $N8N_API_KEY" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD" \
  "$N8N_URL/api/v1/workflows")

ID=$(echo "$RESPONSE" | jq -r '.id // empty')
ERR=$(echo "$RESPONSE" | jq -r '.message // empty')

if [[ -n "$ID" ]]; then
  echo "Workflow creado:"
  echo "$RESPONSE" | jq '{id, name, active, createdAt}'
  echo ""
  echo "Edita en: $N8N_URL/workflow/$ID"
  echo ""
  echo "TODO en el panel n8n:"
  echo "  1. Asignar credencial Telegram a los 3 nodos Telegram"
  echo "  2. Añadir variable COMPRAS_API_URL = URL de Vercel"
  echo "  3. Activar workflow (toggle Active)"
else
  echo "Error subiendo workflow:"
  echo "$RESPONSE" | jq .
  exit 1
fi
