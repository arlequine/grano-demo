import type { CartItem, Customer, ErrorDetail, Order, Product, Quote } from './types';

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3001').replace(/\/+$/, '');

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details: ErrorDetail[] = [],
  ) {
    super(message);
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...init.headers },
    });
  } catch (err) {
    if (init.signal?.aborted) throw err;
    throw new ApiError(0, 'NETWORK_ERROR', 'No pudimos conectar con la tienda. Revisa tu conexión e inténtalo de nuevo.');
  }
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const error = body?.error;
    throw new ApiError(res.status, error?.code ?? 'UNKNOWN', error?.message ?? 'Algo salió mal. Inténtalo de nuevo.', error?.details);
  }
  return body as T;
}

export async function fetchProducts(): Promise<Product[]> {
  const { products } = await request<{ products: Product[] }>('/api/products');
  return products;
}

export function fetchQuote(items: CartItem[], couponCode: string | null, signal?: AbortSignal): Promise<Quote> {
  return request<Quote>('/api/cart/quote', {
    method: 'POST',
    body: JSON.stringify({ items, ...(couponCode && { couponCode }) }),
    signal,
  });
}

export function createOrder(items: CartItem[], couponCode: string | null, customer: Customer): Promise<Order> {
  return request<Order>('/api/orders', {
    method: 'POST',
    body: JSON.stringify({ items, ...(couponCode && { couponCode }), customer }),
  });
}
