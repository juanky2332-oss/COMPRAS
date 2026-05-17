// Run: node scripts/convert-data.mjs
// Place your .xlsx files in public/data/ before running
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, '..', 'public', 'data');

if (!existsSync(dataDir)) {
  mkdirSync(dataDir, { recursive: true });
  console.log('Created public/data/ directory. Place your .xlsx files there.');
  process.exit(0);
}

const files = readdirSync(dataDir).filter(f => f.endsWith('.xlsx') || f.endsWith('.xls'));
console.log(`Found ${files.length} Excel file(s): ${files.join(', ')}`);
console.log('Excel files will be read directly by the app at runtime.');
console.log('No conversion needed - the app uses xlsx library directly.');
