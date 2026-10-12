import { findProduct } from './catalog.js';
import initialStock from './data/stock.json' with { type: 'json' };
import { AppError, type ErrorDetail } from './errors.js';
import { mergeItems, type QuoteItem } from './pricing.js';

// Bolsas disponibles por producto. Viven en memoria: al reiniciar la API vuelven a
// los valores de data/stock.json, igual que los pedidos (docs/plan.md §5).
export class Inventory {
  private readonly stock: Map<string, number>;

  constructor(stock: Record<string, number> = initialStock) {
    this.stock = new Map(Object.entries(stock));
  }

  available(productId: string): number {
    return this.stock.get(productId) ?? 0;
  }

  // Lanza 409 OUT_OF_STOCK con una entrada por cada producto que no alcanza.
  assertAvailable(items: QuoteItem[]): void {
    const shortages: ErrorDetail[] = [];
    for (const { productId, quantity } of mergeItems(items)) {
      const available = this.available(productId);
      if (quantity > available) {
        const name = findProduct(productId)?.name ?? productId;
        shortages.push({
          path: `items.${productId}`,
          message: available === 0 ? `${name} está agotado` : `Solo quedan ${available} de ${name}`,
          productId,
          requested: quantity,
          available,
        });
      }
    }
    if (shortages.length > 0) {
      throw new AppError(409, 'OUT_OF_STOCK', 'No hay suficiente stock para tu pedido', shortages);
    }
  }

  // Verifica y descuenta todo o nada. Es síncrono, así que dos pedidos no se intercalan.
  take(items: QuoteItem[]): void {
    this.assertAvailable(items);
    for (const { productId, quantity } of mergeItems(items)) {
      this.stock.set(productId, this.available(productId) - quantity);
    }
  }
}
