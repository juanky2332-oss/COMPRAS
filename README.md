# COMPRAS AI — Vidal Golosinas

Asistente inteligente de compras: sube una foto o captura y obtén códigos SAP y proveedores recomendados.

## Setup rápido

### 1. Instalar dependencias
```bash
npm install
```

### 2. Variables de entorno
Crea un archivo `.env.local`:
```
OPENAI_API_KEY=sk-...
```

### 3. Añadir datos
Copia tu archivo `historico compras.xlsx` en la carpeta `public/data/`.

```
public/
  data/
    historico compras.xlsx   ← aquí
    articulos-sap.xlsx       ← aquí (cuando lo tengas)
```

### 4. Ejecutar en local
```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000)

## Deploy en Vercel

1. Sube el repo a GitHub
2. Importa en [vercel.com](https://vercel.com)
3. Añade la variable de entorno `OPENAI_API_KEY` en Settings → Environment Variables
4. **Importante**: El archivo Excel debe estar en `public/data/` dentro del repo para que Vercel lo sirva

## Cómo funciona

1. Sube imagen/foto/PDF con los materiales que necesitas
2. GPT-4 Vision extrae los artículos identificados
3. Busca en tu histórico de compras por descripción
4. Devuelve:
   - **Código SAP** si está en la base de datos
   - **Proveedores** que históricamente han suministrado ese tipo de material
   - Si no encuentra nada, lo dice claramente (no inventa)

## Actualizar datos

Simplemente reemplaza el Excel en `public/data/` y haz commit.
