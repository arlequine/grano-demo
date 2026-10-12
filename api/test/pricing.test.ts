import { describe, expect, it } from 'vitest';
import { quote } from '../src/pricing.js';

// Casos obligatorios de docs/plan.md §3 (montos en centavos).
describe('quote', () => {
  it('caso de referencia del PRD: 2 × Huila + 1 × Chiapas con BIENVENIDA10 = $837.00', () => {
    const result = quote(
      [
        { productId: 'huila', quantity: 2 },
        { productId: 'chiapas', quantity: 1 },
      ],
      'BIENVENIDA10',
    );
    expect(result).toEqual({
      lines: [
        { productId: 'huila', name: 'Huila', unitPriceCents: 32000, quantity: 2, lineTotalCents: 64000 },
        { productId: 'chiapas', name: 'Chiapas', unitPriceCents: 29000, quantity: 1, lineTotalCents: 29000 },
      ],
      subtotalCents: 93000,
      coupon: { code: 'BIENVENIDA10', status: 'applied' },
      discountCents: 9300,
      discountedSubtotalCents: 83700,
      shippingCents: 0,
      amountToFreeShippingCents: 0,
      totalCents: 83700,
    });
  });

  it.each([
    {
      name: 'referencia sin cupón',
      items: [{ productId: 'huila', quantity: 2 }, { productId: 'chiapas', quantity: 1 }],
      coupon: undefined,
      expected: { subtotalCents: 93000, discountCents: 0, discountedSubtotalCents: 93000, shippingCents: 0, amountToFreeShippingCents: 0, totalCents: 93000 },
    },
    {
      name: 'exactamente en el límite de $600: envío gratis',
      items: [{ productId: 'veracruz', quantity: 1 }, { productId: 'huila', quantity: 1 }],
      coupon: undefined,
      expected: { subtotalCents: 60000, discountCents: 0, discountedSubtotalCents: 60000, shippingCents: 0, amountToFreeShippingCents: 0, totalCents: 60000 },
    },
    {
      name: 'faltan $10 para envío gratis',
      items: [{ productId: 'chiapas', quantity: 1 }, { productId: 'tolima', quantity: 1 }],
      coupon: undefined,
      expected: { subtotalCents: 59000, discountCents: 0, discountedSubtotalCents: 59000, shippingCents: 9900, amountToFreeShippingCents: 1000, totalCents: 68900 },
    },
    {
      name: 'el cupón baja el subtotal del límite y se cobra envío',
      items: [{ productId: 'huila', quantity: 1 }, { productId: 'narino', quantity: 1 }],
      coupon: 'BIENVENIDA10',
      expected: { subtotalCents: 66000, discountCents: 6600, discountedSubtotalCents: 59400, shippingCents: 9900, amountToFreeShippingCents: 600, totalCents: 69300 },
    },
    {
      name: 'cupón con espacios y minúsculas',
      items: [{ productId: 'oaxaca', quantity: 1 }],
      coupon: ' bienvenida10 ',
      expected: { subtotalCents: 31000, discountCents: 3100, discountedSubtotalCents: 27900, shippingCents: 9900, amountToFreeShippingCents: 32100, totalCents: 37800 },
    },
    {
      name: 'cupón inválido no altera el total',
      items: [{ productId: 'oaxaca', quantity: 1 }],
      coupon: 'NOEXISTE',
      expected: { subtotalCents: 31000, discountCents: 0, discountedSubtotalCents: 31000, shippingCents: 9900, amountToFreeShippingCents: 29000, totalCents: 40900 },
    },
  ])('$name', ({ items, coupon, expected }) => {
    expect(quote(items, coupon)).toMatchObject(expected);
  });

  it('normaliza el cupón y marca el inválido', () => {
    expect(quote([{ productId: 'oaxaca', quantity: 1 }], ' bienvenida10 ').coupon).toEqual({
      code: 'BIENVENIDA10',
      status: 'applied',
    });
    expect(quote([{ productId: 'oaxaca', quantity: 1 }], 'noexiste').coupon).toEqual({
      code: 'NOEXISTE',
      status: 'invalid',
      message: 'Cupón no válido',
    });
  });

  it('trata un cupón vacío como sin cupón', () => {
    expect(quote([{ productId: 'oaxaca', quantity: 1 }], '   ').coupon).toBeNull();
  });

  it('suma las cantidades de un producto repetido', () => {
    const result = quote([
      { productId: 'huila', quantity: 1 },
      { productId: 'chiapas', quantity: 1 },
      { productId: 'huila', quantity: 1 },
    ]);
    expect(result.lines.map(({ productId, quantity }) => ({ productId, quantity }))).toEqual([
      { productId: 'huila', quantity: 2 },
      { productId: 'chiapas', quantity: 1 },
    ]);
    expect(result.subtotalCents).toBe(93000);
  });

  it('rechaza un producto desconocido', () => {
    expect(() => quote([{ productId: 'kenia', quantity: 1 }])).toThrowError(
      expect.objectContaining({ status: 422, code: 'UNKNOWN_PRODUCT' }),
    );
  });
});
