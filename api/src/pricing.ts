import { findProduct } from './catalog.js';
import { AppError } from './errors.js';

export const SHIPPING_CENTS = 9900;
export const FREE_SHIPPING_THRESHOLD_CENTS = 60000;

// Código de cupón (normalizado) → porcentaje de descuento sobre el subtotal.
const COUPONS: Record<string, number> = {
  BIENVENIDA10: 10,
};

export type QuoteItem = { productId: string; quantity: number };

export type QuoteLine = {
  productId: string;
  name: string;
  unitPriceCents: number;
  quantity: number;
  lineTotalCents: number;
};

export type CouponResult =
  | { code: string; status: 'applied' }
  | { code: string; status: 'invalid'; message: string };

export type Quote = {
  lines: QuoteLine[];
  subtotalCents: number;
  coupon: CouponResult | null;
  discountCents: number;
  discountedSubtotalCents: number;
  shippingCents: number;
  amountToFreeShippingCents: number;
  totalCents: number;
};

export function normalizeCouponCode(code: string | undefined): string | null {
  const normalized = code?.trim().toUpperCase();
  return normalized ? normalized : null;
}

// Suma las cantidades de un mismo producto conservando el orden de aparición.
export function mergeItems(items: QuoteItem[]): QuoteItem[] {
  const merged = new Map<string, number>();
  for (const { productId, quantity } of items) {
    merged.set(productId, (merged.get(productId) ?? 0) + quantity);
  }
  return [...merged].map(([productId, quantity]) => ({ productId, quantity }));
}

// Reglas de precio de docs/plan.md §3. Todos los montos en centavos enteros.
export function quote(items: QuoteItem[], couponCode?: string): Quote {
  const lines = mergeItems(items).map(({ productId, quantity }) => {
    const product = findProduct(productId);
    if (!product) {
      throw new AppError(422, 'UNKNOWN_PRODUCT', `El producto «${productId}» no existe`, [
        { path: 'items', message: `Producto desconocido: ${productId}` },
      ]);
    }
    return {
      productId,
      name: product.name,
      unitPriceCents: product.priceCents,
      quantity,
      lineTotalCents: product.priceCents * quantity,
    };
  });

  const subtotalCents = lines.reduce((sum, line) => sum + line.lineTotalCents, 0);

  const code = normalizeCouponCode(couponCode);
  let coupon: CouponResult | null = null;
  let discountCents = 0;
  if (code) {
    const percent = COUPONS[code];
    if (percent === undefined) {
      coupon = { code, status: 'invalid', message: 'Cupón no válido' };
    } else {
      coupon = { code, status: 'applied' };
      discountCents = Math.round((subtotalCents * percent) / 100);
    }
  }

  const discountedSubtotalCents = subtotalCents - discountCents;
  const shippingCents = discountedSubtotalCents >= FREE_SHIPPING_THRESHOLD_CENTS ? 0 : SHIPPING_CENTS;
  const amountToFreeShippingCents = Math.max(0, FREE_SHIPPING_THRESHOLD_CENTS - discountedSubtotalCents);

  return {
    lines,
    subtotalCents,
    coupon,
    discountCents,
    discountedSubtotalCents,
    shippingCents,
    amountToFreeShippingCents,
    totalCents: discountedSubtotalCents + shippingCents,
  };
}
