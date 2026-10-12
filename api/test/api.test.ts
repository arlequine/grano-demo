import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { generateOrderId, OrderStore } from '../src/orders.js';

const referenceItems = [
  { productId: 'huila', quantity: 2 },
  { productId: 'chiapas', quantity: 1 },
];

const customer = {
  name: 'Ana López',
  email: 'ana@correo.com',
  phone: '55 1234 5678',
  address: 'Calle 1 #2, CDMX, 01000',
};

let store: OrderStore;
let app: ReturnType<typeof createApp>;

beforeEach(() => {
  store = new OrderStore();
  app = createApp({ orderStore: store });
});

describe('GET /health', () => {
  it('responde ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });
});

describe('GET /api/products', () => {
  it('devuelve los 6 cafés con precio en centavos', async () => {
    const res = await request(app).get('/api/products');
    expect(res.status).toBe(200);
    expect(res.body.products).toHaveLength(6);
    expect(res.body.products[0]).toEqual({
      id: 'huila',
      name: 'Huila',
      region: 'Huila, Colombia',
      process: 'Lavado',
      roast: 'Medio',
      notes: ['Panela', 'Durazno', 'Cacao'],
      priceCents: 32000,
      grams: 340,
      stock: 12,
    });
  });
});

describe('POST /api/cart/quote', () => {
  it('caso de referencia del PRD: total $837.00 con envío gratis', async () => {
    const res = await request(app)
      .post('/api/cart/quote')
      .send({ items: referenceItems, couponCode: 'BIENVENIDA10' });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      subtotalCents: 93000,
      coupon: { code: 'BIENVENIDA10', status: 'applied' },
      discountCents: 9300,
      discountedSubtotalCents: 83700,
      shippingCents: 0,
      amountToFreeShippingCents: 0,
      totalCents: 83700,
    });
  });

  it('sin cupón devuelve coupon null', async () => {
    const res = await request(app).post('/api/cart/quote').send({ items: referenceItems });
    expect(res.status).toBe(200);
    expect(res.body.coupon).toBeNull();
    expect(res.body.totalCents).toBe(93000);
  });

  it('con cupón inválido responde 200 sin descuento', async () => {
    const res = await request(app)
      .post('/api/cart/quote')
      .send({ items: [{ productId: 'oaxaca', quantity: 1 }], couponCode: 'NOEXISTE' });
    expect(res.status).toBe(200);
    expect(res.body.coupon).toEqual({ code: 'NOEXISTE', status: 'invalid', message: 'Cupón no válido' });
    expect(res.body.discountCents).toBe(0);
    expect(res.body.totalCents).toBe(40900);
  });

  it('ignora precios enviados por el cliente', async () => {
    const res = await request(app)
      .post('/api/cart/quote')
      .send({ items: [{ productId: 'huila', quantity: 1, priceCents: 1, unitPriceCents: 1 }], totalCents: 1 });
    expect(res.status).toBe(200);
    expect(res.body.subtotalCents).toBe(32000);
  });

  it.each([
    { name: 'carrito vacío', body: { items: [] } },
    { name: 'sin items', body: {} },
    { name: 'cantidad 0', body: { items: [{ productId: 'huila', quantity: 0 }] } },
    { name: 'cantidad decimal', body: { items: [{ productId: 'huila', quantity: 1.5 }] } },
    { name: 'cantidad mayor a 20', body: { items: [{ productId: 'huila', quantity: 21 }] } },
    { name: 'cantidad como texto', body: { items: [{ productId: 'huila', quantity: '2' }] } },
    {
      name: 'más de 20 al sumar un producto repetido',
      body: { items: [{ productId: 'huila', quantity: 15 }, { productId: 'huila', quantity: 6 }] },
    },
  ])('400 con $name', async ({ body }) => {
    const res = await request(app).post('/api/cart/quote').send(body);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details.length).toBeGreaterThan(0);
  });

  it('400 con un cuerpo que no es JSON', async () => {
    const res = await request(app)
      .post('/api/cart/quote')
      .set('Content-Type', 'application/json')
      .send('{"items": [');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('422 con un producto desconocido', async () => {
    const res = await request(app)
      .post('/api/cart/quote')
      .send({ items: [{ productId: 'kenia', quantity: 1 }] });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('UNKNOWN_PRODUCT');
  });
});

describe('POST /api/orders', () => {
  it('crea el pedido del caso de referencia con total $837.00', async () => {
    const res = await request(app)
      .post('/api/orders')
      .send({ items: referenceItems, couponCode: 'BIENVENIDA10', customer });
    expect(res.status).toBe(201);
    expect(res.body.orderId).toMatch(/^GR-[A-HJ-NP-Z2-9]{8}$/);
    expect(new Date(res.body.createdAt).toISOString()).toBe(res.body.createdAt);
    expect(res.body.customer).toEqual(customer);
    expect(res.body.quote.totalCents).toBe(83700);
    expect(store.get(res.body.orderId)).toEqual(res.body);
  });

  it('quita los espacios de los datos del cliente', async () => {
    const res = await request(app)
      .post('/api/orders')
      .send({ items: referenceItems, customer: { ...customer, name: '  Ana López  ' } });
    expect(res.status).toBe(201);
    expect(res.body.customer.name).toBe('Ana López');
  });

  it('recalcula con el catálogo e ignora montos del cliente', async () => {
    const res = await request(app)
      .post('/api/orders')
      .send({ items: [{ productId: 'huila', quantity: 2, priceCents: 1 }], totalCents: 1, customer });
    expect(res.status).toBe(201);
    expect(res.body.quote.totalCents).toBe(64000);
  });

  it('genera números de pedido distintos', async () => {
    const ids = new Set<string>();
    for (let i = 0; i < 5; i++) {
      const res = await request(app).post('/api/orders').send({ items: referenceItems, customer });
      ids.add(res.body.orderId);
    }
    expect(ids.size).toBe(5);
    expect(store.size).toBe(5);
  });

  it('vuelve a generar el número si ya existe', () => {
    const ids = ['GR-AAAAAAAA', 'GR-AAAAAAAA', 'GR-BBBBBBBB'];
    const dupStore = new OrderStore(() => ids.shift()!);
    const quote = { lines: [], subtotalCents: 0, coupon: null, discountCents: 0, discountedSubtotalCents: 0, shippingCents: 0, amountToFreeShippingCents: 0, totalCents: 0 };
    expect(dupStore.create(customer, quote).orderId).toBe('GR-AAAAAAAA');
    expect(dupStore.create(customer, quote).orderId).toBe('GR-BBBBBBBB');
  });

  it('generateOrderId usa el formato GR- + 8 caracteres sin 0/O/1/I', () => {
    for (let i = 0; i < 100; i++) {
      expect(generateOrderId()).toMatch(/^GR-[A-HJ-NP-Z2-9]{8}$/);
    }
  });

  it('422 con un cupón inválido y no crea el pedido', async () => {
    const res = await request(app)
      .post('/api/orders')
      .send({ items: referenceItems, couponCode: 'NOEXISTE', customer });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('INVALID_COUPON');
    expect(store.size).toBe(0);
  });

  it('422 con un producto desconocido', async () => {
    const res = await request(app)
      .post('/api/orders')
      .send({ items: [{ productId: 'kenia', quantity: 1 }], customer });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('UNKNOWN_PRODUCT');
  });

  it.each([
    { name: 'sin customer', customer: undefined, path: 'customer' },
    { name: 'nombre vacío', customer: { ...customer, name: '   ' }, path: 'customer.name' },
    { name: 'correo inválido', customer: { ...customer, email: 'ana@' }, path: 'customer.email' },
    { name: 'teléfono corto', customer: { ...customer, phone: '12345' }, path: 'customer.phone' },
    { name: 'teléfono con letras', customer: { ...customer, phone: '55-1234-ABCD' }, path: 'customer.phone' },
    { name: 'sin dirección', customer: { ...customer, address: undefined }, path: 'customer.address' },
  ])('400 con $name', async ({ customer: invalidCustomer, path }) => {
    const res = await request(app)
      .post('/api/orders')
      .send({ items: referenceItems, customer: invalidCustomer });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details.map((detail: { path: string }) => detail.path)).toContain(path);
    expect(store.size).toBe(0);
  });

  it('los mensajes de campos vacíos concuerdan en género', async () => {
    const res = await request(app)
      .post('/api/orders')
      .send({ items: referenceItems, customer: { name: '', email: '', phone: '', address: '' } });
    const messages = Object.fromEntries(
      res.body.error.details.map((detail: { path: string; message: string }) => [detail.path, detail.message]),
    );
    expect(messages['customer.name']).toBe('El nombre es obligatorio');
    expect(messages['customer.address']).toBe('La dirección es obligatoria');
  });
});

describe('rutas desconocidas', () => {
  it('404 con el formato de error', async () => {
    const res = await request(app).get('/api/nada');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: { code: 'NOT_FOUND', message: 'Ruta no encontrada' } });
  });
});
