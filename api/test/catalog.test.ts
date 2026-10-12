import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { catalogFromCsv, slugify } from '../scripts/csv.js';
import { products } from '../src/catalog.js';

describe('catálogo', () => {
  it('coincide con docs/catalogo.csv (si falla: npm run catalog)', () => {
    const csv = readFileSync(resolve(import.meta.dirname, '../../docs/catalogo.csv'), 'utf8');
    expect(products).toEqual(catalogFromCsv(csv));
  });

  it('tiene los 6 ids esperados', () => {
    expect(products.map((product) => product.id)).toEqual([
      'huila',
      'chiapas',
      'veracruz',
      'oaxaca',
      'narino',
      'tolima',
    ]);
  });

  it('genera ids en minúsculas y sin acentos', () => {
    expect(slugify('Nariño')).toBe('narino');
    expect(slugify('Café Áurea')).toBe('cafe-aurea');
  });

  it('respeta las comas dentro de comillas y separa las notas', () => {
    const [product] = catalogFromCsv(
      'nombre,region,proceso,tueste,notas,precio_mxn,gramos\nPrueba,"Coatepec, Veracruz",Honey,Claro,Miel; Nuez,280,340\n',
    );
    expect(product).toEqual({
      id: 'prueba',
      name: 'Prueba',
      region: 'Coatepec, Veracruz',
      process: 'Honey',
      roast: 'Claro',
      notes: ['Miel', 'Nuez'],
      priceCents: 28000,
      grams: 340,
    });
  });
});
