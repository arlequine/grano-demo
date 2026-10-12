import { formatMoney } from '../format';
import type { CartItem, Product, Quote } from '../types';

type Props = {
  items: CartItem[];
  products: Product[];
  quote: Quote | null;
  maxQuantityFor: (productId: string) => number;
  readOnly?: boolean;
  onChangeQuantity?: (productId: string, quantity: number) => void;
};

export function CartLines({ items, products, quote, maxQuantityFor, readOnly = false, onChangeQuantity }: Props) {
  return (
    <ul className="cart-lines">
      {items.map(({ productId, quantity }) => {
        const product = products.find((p) => p.id === productId);
        const line = quote?.lines.find((l) => l.productId === productId && l.quantity === quantity);
        const name = product?.name ?? productId;
        return (
          <li key={productId} className="cart-line">
            <div className="cart-line-info">
              <span className="cart-line-name">{name}</span>
              {product && <span className="cart-line-unit">{formatMoney(product.priceCents)} c/u</span>}
            </div>
            {readOnly ? (
              <span className="cart-line-qty-static">× {quantity}</span>
            ) : (
              <div className="stepper" role="group" aria-label={`Cantidad de ${name}`}>
                <button
                  type="button"
                  onClick={() => onChangeQuantity?.(productId, quantity - 1)}
                  aria-label={quantity === 1 ? `Quitar ${name}` : `Quitar una bolsa de ${name}`}
                >
                  −
                </button>
                <span aria-live="polite">{quantity}</span>
                <button
                  type="button"
                  onClick={() => onChangeQuantity?.(productId, quantity + 1)}
                  disabled={quantity >= maxQuantityFor(productId)}
                  aria-label={`Agregar una bolsa de ${name}`}
                >
                  +
                </button>
              </div>
            )}
            <span className="cart-line-total">{line ? formatMoney(line.lineTotalCents) : '…'}</span>
          </li>
        );
      })}
    </ul>
  );
}
