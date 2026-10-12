import { randomInt } from 'node:crypto';
import type { Customer } from './schemas.js';
import type { Quote } from './pricing.js';

export type Order = {
  orderId: string;
  createdAt: string;
  customer: Customer;
  quote: Quote;
};

// Sin 0/O ni 1/I para que el número se pueda dictar sin confusiones.
const ID_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const ID_LENGTH = 8;

export function generateOrderId(): string {
  let id = 'GR-';
  for (let i = 0; i < ID_LENGTH; i++) {
    id += ID_ALPHABET[randomInt(ID_ALPHABET.length)];
  }
  return id;
}

// Pedidos en memoria: se pierden al reiniciar la API (docs/plan.md §5).
export class OrderStore {
  private readonly orders = new Map<string, Order>();

  constructor(private readonly nextId: () => string = generateOrderId) {}

  create(customer: Customer, quote: Quote): Order {
    let orderId = this.nextId();
    while (this.orders.has(orderId)) {
      orderId = this.nextId();
    }
    const order = { orderId, createdAt: new Date().toISOString(), customer, quote };
    this.orders.set(orderId, order);
    return order;
  }

  get(orderId: string): Order | undefined {
    return this.orders.get(orderId);
  }

  get size(): number {
    return this.orders.size;
  }
}
