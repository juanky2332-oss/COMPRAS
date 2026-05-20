import path from 'path';
import fs from 'fs';

/**
 * Directorio extendido de proveedores cargado desde
 * public/data/proveedores_habituales_enriched.json
 *
 * Combina los 29 proveedores habituales del Excel matriz + 14 con histórico de compras.
 * Incluye campos de contacto (email/teléfono/web) listos para rellenar manualmente
 * o desde fuentes oficiales.
 */

export interface SupplierDirectoryEntry {
  nombre_corto: string;
  nombre_oficial: string;
  id_sap: string | null;
  marcas: string[];
  notas: string[];
  tiene_historial: boolean;
  compras_historicas: number;
  items_distintos: number;
  actividad: string;
  email: string;
  telefono: string;
  web_oficial: string;
  direccion: string;
  poblacion: string;
  pais: string;
  preferente: boolean;
}

let cached: SupplierDirectoryEntry[] | null = null;

export function loadSupplierDirectory(): SupplierDirectoryEntry[] {
  if (cached) return cached;
  const file = path.join(process.cwd(), 'public', 'data', 'proveedores_habituales_enriched.json');
  if (!fs.existsSync(file)) {
    cached = [];
    return cached;
  }
  const raw = fs.readFileSync(file, 'utf-8');
  cached = JSON.parse(raw) as SupplierDirectoryEntry[];
  return cached;
}

function normalize(s: string): string {
  return s.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '');
}

export function findSupplierInDirectory(
  identifier: { id_sap?: string | null; nombre?: string | null }
): SupplierDirectoryEntry | undefined {
  const dir = loadSupplierDirectory();
  if (identifier.id_sap) {
    const m = dir.find(d => d.id_sap === identifier.id_sap);
    if (m) return m;
  }
  if (identifier.nombre) {
    const n = normalize(identifier.nombre);
    return dir.find(d =>
      normalize(d.nombre_corto) === n ||
      normalize(d.nombre_oficial) === n ||
      normalize(d.nombre_oficial).includes(n) ||
      n.includes(normalize(d.nombre_corto)),
    );
  }
  return undefined;
}

export function findSuppliersByBrand(brand: string): SupplierDirectoryEntry[] {
  const dir = loadSupplierDirectory();
  const b = normalize(brand);
  if (b.length < 2) return [];
  return dir.filter(d =>
    d.marcas.some(m => normalize(m) === b || normalize(m).includes(b) || b.includes(normalize(m))),
  );
}
