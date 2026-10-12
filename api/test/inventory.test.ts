import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { products } from '../src/catalog.js';
import initialStock from '../src/data/stock.json' with { type: 'json' };
import { Inventory } from '../src/inventory.js';
import { OrderStore } from '../src/orders.js';

const customer = {
  name: 'Ana López',
  email: 'ana@correo.com',
  phone: '55 1234 5678',
  address: 'Calle 1 #2, CDMX, 01000',
};

let inventory: Inventory;
let store: OrderStore;
let app: ReturnType<typeof createApp>;

beforeEach(() => {
  inventory = new Inventory();
  store = new OrderStore();
  app = createApp({ inventory, orderStore: store });
});

async function stockOf(productId: string): Promise<number> {
  const res = await request(app).get('/api/products');
  return res.body.products.find((product: { id: string }) => product.id === productId).stock;
}

describe('stock inicial', () => {
  it('tiene los valores de la historia v1.1', () => {
    expect(initialStock).toEqual({ huila: 12, chiapas: 8, veracruz: 10, oaxaca: 3, narino: 0, tolima: 6 });
  });

  it('tiene una entrada por cada café del catálogo', () => {
    expect(Object.keys(initialStock).sort()).toEqual(products.map((product) => product.id).sort());
  });

  it('GET /api/products incluye el stock de cada café', async () => {
    const res = await request(app).get('/api/products');
    expect(
      Object.fromEntries(res.body.products.map((product: { id: string; stock: number }) => [product.id, product.stock])),
    ).toEqual(initialStock);
  });
});

describe('POST /api/cart/quote con stock', () => {
  it('permite pedir exactamente lo que hay', async () => {
    const res = await request(app)
      .post('/api/cart/quote')
      .send({ items: [{ productId: 'oaxaca', quantity: 3 }] });
    expect(res.status).toBe(200);
    expect(res.body.totalCents).toBe(93000);
  });

  it('409 OUT_OF_STOCK al pedir más de lo que hay', async () => {
    const res = await request(app)
      .post('/api/cart/quote')
      .send({ items: [{ productId: 'oaxaca', quantity: 4 }] });
    expect(res.status).toBe(409);
    expect(res.body.error).toEqual({
      code: 'OUT_OF_STOCK',
      message: 'No hay suficiente stock para tu pedido',
      details: [
        { path: 'items.oaxaca', message: 'Solo quedan 3 de Oaxaca', productId: 'oaxaca', requested: 4, available: 3 },
      ],
    });
  });

  it('409 con un café agotado', async () => {
    const res = await request(app)
      .post('/api/cart/quote')
      .send({ items: [{ productId: 'narino', quantity: 1 }] });
    expect(res.status).toBe(409);
    expect(res.body.error.details[0]).toMatchObject({ message: 'Nariño está agotado', available: 0 });
  });

  it('suma las cantidades repetidas antes de comparar con el stock', async () => {
    const res = await request(app)
      .post('/api/cart/quote')
      .send({ items: [{ productId: 'oaxaca', quantity: 2 }, { productId: 'oaxaca', quantity: 2 }] });
    expect(res.status).toBe(409);
    expect(res.body.error.details[0]).toMatchObject({ productId: 'oaxaca', requested: 4, available: 3 });
  });

  it('reporta todos los cafés que no alcanzan', async () => {
    const res = await request(app)
      .post('/api/cart/quote')
      .send({
        items: [
          { productId: 'huila', quantity: 2 },
          { productId: 'narino', quantity: 1 },
          { productId: 'tolima', quantity: 7 },
        ],
      });
    expect(res.status).toBe(409);
    expect(res.body.error.details.map((detail: { productId: string }) => detail.productId)).toEqual([
      'narino',
      'tolima',
    ]);
  });

  it('un producto desconocido sigue siendo 422, no 409', async () => {
    const res = await request(app)
      .post('/api/cart/quote')
      .send({ items: [{ productId: 'kenia', quantity: 1 }] });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('UNKNOWN_PRODUCT');
  });

  it('cotizar no descuenta stock', async () => {
    await request(app).post('/api/cart/quote').send({ items: [{ productId: 'oaxaca', quantity: 3 }] });
    expect(await stockOf('oaxaca')).toBe(3);
  });
});

describe('POST /api/orders con stock', () => {
  it('descuenta el stock al crear el pedido (caso de referencia)', async () => {
    const res = await request(app)
      .post('/api/orders')
      .send({
        items: [{ productId: 'huila', quantity: 2 }, { productId: 'chiapas', quantity: 1 }],
        couponCode: 'BIENVENIDA10',
        customer,
      });
    expect(res.status).toBe(201);
    expect(res.body.quote.totalCents).toBe(83700);
    expect(await stockOf('huila')).toBe(10);
    expect(await stockOf('chiapas')).toBe(7);
    expect(await stockOf('oaxaca')).toBe(3);
  });

  it('409 cuando un pedido anterior agotó el stock', async () => {
    const first = await request(app)
      .post('/api/orders')
      .send({ items: [{ productId: 'oaxaca', quantity: 2 }], customer });
    expect(first.status).toBe(201);

    const second = await request(app)
      .post('/api/orders')
      .send({ items: [{ productId: 'oaxaca', quantity: 2 }], customer });
    expect(second.status).toBe(409);
    expect(second.body.error.details[0]).toMatchObject({ productId: 'oaxaca', requested: 2, available: 1 });
    expect(await stockOf('oaxaca')).toBe(1);
    expect(store.size).toBe(1);
  });

  it('un pedido que no alcanza no descuenta nada (todo o nada)', async () => {
    const res = await request(app)
      .post('/api/orders')
      .send({ items: [{ productId: 'huila', quantity: 2 }, { productId: 'oaxaca', quantity: 4 }], customer });
    expect(res.status).toBe(409);
    expect(await stockOf('huila')).toBe(12);
    expect(await stockOf('oaxaca')).toBe(3);
    expect(store.size).toBe(0);
  });

  it('un pedido rechazado por cupón inválido no descuenta stock', async () => {
    const res = await request(app)
      .post('/api/orders')
      .send({ items: [{ productId: 'oaxaca', quantity: 1 }], couponCode: 'NOEXISTE', customer });
    expect(res.status).toBe(422);
    expect(await stockOf('oaxaca')).toBe(3);
  });

  it('un pedido con datos inválidos no descuenta stock', async () => {
    const res = await request(app)
      .post('/api/orders')
      .send({ items: [{ productId: 'oaxaca', quantity: 1 }], customer: { ...customer, email: 'ana@' } });
    expect(res.status).toBe(400);
    expect(await stockOf('oaxaca')).toBe(3);
  });

  it('se puede vender hasta dejar el café en 0 y luego queda agotado', async () => {
    const res = await request(app)
      .post('/api/orders')
      .send({ items: [{ productId: 'oaxaca', quantity: 3 }], customer });
    expect(res.status).toBe(201);
    expect(await stockOf('oaxaca')).toBe(0);

    const quote = await request(app)
      .post('/api/cart/quote')
      .send({ items: [{ productId: 'oaxaca', quantity: 1 }] });
    expect(quote.status).toBe(409);
  });

  it('cada app arranca con su propio inventario', async () => {
    await request(app).post('/api/orders').send({ items: [{ productId: 'oaxaca', quantity: 3 }], customer });
    const otherApp = createApp();
    const res = await request(otherApp).get('/api/products');
    expect(res.body.products.find((product: { id: string }) => product.id === 'oaxaca').stock).toBe(3);
  });
});
