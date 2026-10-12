// Copia del contrato de docs/plan.md §2. Montos en centavos MXN.

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

export type CartItem = { productId: string; quantity: number };

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

export type Customer = {
  name: string;
  email: string;
  phone: string;
  address: string;
};

export type Order = {
  orderId: string;
  createdAt: string;
  customer: Customer;
  quote: Quote;
};

export type ErrorDetail = { path: string; message: string };
