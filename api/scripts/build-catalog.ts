// Regenera src/data/catalog.json a partir de docs/catalogo.csv: npm run catalog
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { catalogFromCsv } from './csv.js';

const csvPath = resolve(import.meta.dirname, '../../docs/catalogo.csv');
const jsonPath = resolve(import.meta.dirname, '../src/data/catalog.json');

const catalog = catalogFromCsv(readFileSync(csvPath, 'utf8'));
writeFileSync(jsonPath, JSON.stringify(catalog, null, 2) + '\n');
console.log(`Catálogo escrito en ${jsonPath} (${catalog.length} cafés)`);
