// Sincroniza data/proveedores_contactos_template.csv -> public/data/proveedores_habituales_enriched.json
// Ejecutar: node scripts/sync-contactos.mjs
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const csvPath = join(root, 'data', 'proveedores_contactos_template.csv');
const jsonPath = join(root, 'public', 'data', 'proveedores_habituales_enriched.json');

function parseCsv(text) {
  const rows = [];
  let cur = [], field = '', inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') inQuotes = false;
      else field += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ',') { cur.push(field); field = ''; }
      else if (c === '\n') { cur.push(field); rows.push(cur); cur = []; field = ''; }
      else if (c === '\r') { /* skip */ }
      else field += c;
    }
  }
  if (field.length > 0 || cur.length > 0) { cur.push(field); rows.push(cur); }
  return rows;
}

const csv = readFileSync(csvPath, 'utf-8');
const rows = parseCsv(csv);
const header = rows[0].map(h => h.trim());
const idx = (k) => header.indexOf(k);

const data = JSON.parse(readFileSync(jsonPath, 'utf-8'));
const updates = new Map();
for (const row of rows.slice(1)) {
  if (row.length < 2 || !row[idx('nombre_corto')]) continue;
  updates.set(row[idx('nombre_corto')].trim(), {
    actividad:   row[idx('actividad')]   || '',
    email:       row[idx('email')]       || '',
    telefono:    row[idx('telefono')]    || '',
    web_oficial: row[idx('web_oficial')] || '',
    direccion:   row[idx('direccion')]   || '',
  });
}

let updated = 0;
for (const p of data) {
  const u = updates.get(p.nombre_corto);
  if (!u) continue;
  if (u.actividad)   { p.actividad   = u.actividad;   updated++; }
  if (u.email)       p.email         = u.email;
  if (u.telefono)    p.telefono      = u.telefono;
  if (u.web_oficial) p.web_oficial   = u.web_oficial;
  if (u.direccion)   p.direccion     = u.direccion;
}

writeFileSync(jsonPath, JSON.stringify(data, null, 2), 'utf-8');
console.log(`Sincronizado: ${updated} campos actualizados sobre ${data.length} proveedores.`);
console.log(`-> ${jsonPath}`);
