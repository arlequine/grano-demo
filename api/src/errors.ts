export type ErrorDetail = {
  path: string;
  message: string;
  // Solo en OUT_OF_STOCK.
  productId?: string;
  requested?: number;
  available?: number;
};

export class AppError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: ErrorDetail[],
  ) {
    super(message);
  }
}
