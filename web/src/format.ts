const currency = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });

export function formatMoney(cents: number): string {
  return currency.format(cents / 100);
}
