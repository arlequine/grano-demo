import { formatMoney } from '../format';
import type { Quote } from '../types';

type Props = { quote: Quote; pending?: boolean };

// Muestra los montos tal como los devuelve la API: aquí no se calcula nada.
export function Totals({ quote, pending = false }: Props) {
  return (
    <dl className={`totals${pending ? ' is-pending' : ''}`} aria-busy={pending}>
      <div>
        <dt>Subtotal</dt>
        <dd>{formatMoney(quote.subtotalCents)}</dd>
      </div>
      {quote.discountCents > 0 && (
        <div className="totals-discount">
          <dt>Descuento {quote.coupon?.code}</dt>
          <dd>−{formatMoney(quote.discountCents)}</dd>
        </div>
      )}
      <div>
        <dt>Envío</dt>
        <dd>{quote.shippingCents === 0 ? 'Gratis' : formatMoney(quote.shippingCents)}</dd>
      </div>
      <div className="totals-total">
        <dt>Total</dt>
        <dd>{formatMoney(quote.totalCents)}</dd>
      </div>
      {quote.amountToFreeShippingCents > 0 && (
        <p className="free-shipping-hint">
          Te faltan <strong>{formatMoney(quote.amountToFreeShippingCents)}</strong> para envío gratis
        </p>
      )}
    </dl>
  );
}
