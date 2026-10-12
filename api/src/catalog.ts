import catalogData from './data/catalog.json' with { type: 'json' };

export type Product = {
  id: string;
  name: string;
  region: string;
  process: string;
  roast: string;
  notes: string[];
  priceCents: number;
  grams: number;
};

export const products: readonly Product[] = catalogData;

const productsById = new Map(products.map((product) => [product.id, product]));

export function findProduct(id: string): Product | undefined {
  return productsById.get(id);
}
