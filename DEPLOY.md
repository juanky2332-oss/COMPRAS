# Despliegue paso a paso

Guía mínima para tener el bot funcionando en Telegram. Tiempo total: ~10 minutos.

## 1. Vercel (3 min)

1. https://vercel.com/new → importa `juanky2332-oss/COMPRAS`
2. Framework: **Next.js** (autodetectado)
3. **Environment Variables** → añade:
   - `OPENAI_API_KEY` = tu clave de OpenAI
4. Deploy → anota la URL (ej. `https://compras-xxx.vercel.app`)

**Verifica:** abre `https://compras-xxx.vercel.app/api/n8n/query` en el navegador. Debe responder con un JSON describiendo el endpoint.

## 2. Bot de Telegram (2 min)

Si aún no lo tienes:

1. En Telegram, habla con `@BotFather` → `/newbot` → nombre y username → te da un **token**
2. Guarda el token; lo metes en n8n en el paso siguiente

## 3. n8n (5 min)

### 3.1 Importar workflow

- En tu panel n8n (`https://paneln8n.transformaconia.com`):
  - **Workflows → New → ... → Import from File**
  - Sube `n8n/Compras-workflow.json` del repo

### 3.2 Credenciales Telegram

- En el panel izquierdo → **Credentials → New → Telegram API**
- Nombre: `Telegram Compras`
- Access Token: el del BotFather
- Save

### 3.3 Asignar credenciales en los nodos

El workflow tiene **3 nodos Telegram** que llevan el placeholder `TELEGRAM_CRED_ID`:
- `Telegram Trigger`
- `Telegram: descargar foto`
- `Telegram: responder`

En cada uno: clic en el nodo → en "Credential to connect with" elige `Telegram Compras`.

### 3.4 Variable de entorno COMPRAS_API_URL

- **Settings → Variables** (o como variable de entorno del sistema, según tu instalación)
- Añade: `COMPRAS_API_URL` = la URL de Vercel del paso 1 (sin barra final)

> Si tu n8n self-hosted no permite añadir variables desde la UI, edita el `docker-compose.yml`/`.env` con `COMPRAS_API_URL=https://compras-xxx.vercel.app` y reinicia.

### 3.5 Activar

Toggle "Active" arriba a la derecha del workflow.

## 4. Probar (1 min)

En Telegram, abre chat con tu bot y manda:

```
necesito 2 rodamientos 6204 2RS
```

Respuesta esperada:
```
*1. Rodamiento 6204 2RS*
   SAP: `5020XXXXX` — RODAMIENTO 6204 2RS  _(Coincidencia alta)_
   Proveedores recomendados:
     1. *ESGAS* — Distribuidor: SKF, FAG, NTN
        Histórico: 1359 compras
     2. ...
```

Manda también una foto de una pieza con caption "qué es esto" — extrae el material y devuelve recomendaciones.

## 5. (Opcional) Rellenar contactos de proveedores

Los Excels no traían email/teléfono/web. Para que el bot los devuelva:

1. Edita `data/proveedores_contactos_template.csv`
2. `node scripts/sync-contactos.mjs`
3. Commit + push → Vercel redeploy automático

## Problemas frecuentes

| Síntoma | Causa | Solución |
|---|---|---|
| `OPENAI_API_KEY is not configured` | Vercel sin la var | añade `OPENAI_API_KEY` y re-deploy |
| El bot no responde | Workflow desactivado o credenciales mal | revisa toggle Active + credenciales Telegram |
| `404 not found` al hacer POST | URL mal en `COMPRAS_API_URL` | sin barra final, con `https://` |
| Respuesta sin proveedores | Material muy genérico | añade marca o referencia en la consulta |
| Imagen no se procesa | Bot sin permiso `Read All` | en BotFather: `/setprivacy` → Disable |
