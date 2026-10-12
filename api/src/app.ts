import express, { type ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { products } from './catalog.js';
import { corsMiddleware } from './cors.js';
import { AppError } from './errors.js';
import { OrderStore } from './orders.js';
import { quote } from './pricing.js';
import { orderRequestSchema, quoteRequestSchema } from './schemas.js';

export type AppOptions = {
  allowedOrigins?: string[];
  orderStore?: OrderStore;
};

export function createApp({ allowedOrigins = [], orderStore = new OrderStore() }: AppOptions = {}) {
  const app = express();

  app.disable('x-powered-by');
  app.use(corsMiddleware(allowedOrigins));
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.get('/api/products', (_req, res) => {
    res.json({ products });
  });

  app.post('/api/cart/quote', (req, res) => {
    const { items, couponCode } = quoteRequestSchema.parse(req.body);
    res.json(quote(items, couponCode));
  });

  app.post('/api/orders', (req, res) => {
    const { items, couponCode, customer } = orderRequestSchema.parse(req.body);
    const orderQuote = quote(items, couponCode);
    if (orderQuote.coupon?.status === 'invalid') {
      throw new AppError(422, 'INVALID_COUPON', 'Cupón no válido', [
        { path: 'couponCode', message: 'Cupón no válido' },
      ]);
    }
    res.status(201).json(orderStore.create(customer, orderQuote));
  });

  app.use((_req, _res, next) => {
    next(new AppError(404, 'NOT_FOUND', 'Ruta no encontrada'));
  });

  const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
    if (err instanceof ZodError) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Datos inválidos',
          details: err.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })),
        },
      });
      return;
    }
    if (err instanceof AppError) {
      res.status(err.status).json({
        error: { code: err.code, message: err.message, ...(err.details && { details: err.details }) },
      });
      return;
    }
    // Errores de express.json().
    if (err?.type === 'entity.parse.failed') {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'El cuerpo no es un JSON válido' } });
      return;
    }
    if (err?.type === 'entity.too.large') {
      res.status(413).json({ error: { code: 'PAYLOAD_TOO_LARGE', message: 'El cuerpo es demasiado grande' } });
      return;
    }
    console.error(err);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Error interno del servidor' } });
  };
  app.use(errorHandler);

  return app;
}
