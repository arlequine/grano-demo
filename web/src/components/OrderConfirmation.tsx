import type { Order } from '../types';
import { Totals } from './Totals';

type Props = { order: Order; onNewOrder: () => void };

export function OrderConfirmation({ order, onNewOrder }: Props) {
  return (
    <div className="confirmation" role="status">
      <p className="confirmation-kicker">¡Gracias, {order.customer.name.split(' ')[0]}!</p>
      <h2>Tu pedido está confirmado</h2>
      <p className="confirmation-label">Número de pedido</p>
      <p className="confirmation-id">{order.orderId}</p>
      <p className="confirmation-note">
        Guarda este número para dar seguimiento a tu pedido. Lo enviaremos a la dirección que nos diste.
      </p>
      <ul className="confirmation-lines">
        {order.quote.lines.map((line) => (
          <li key={line.productId}>
            <span>
              {line.quantity} × {line.name}
            </span>
          </li>
        ))}
      </ul>
      <Totals quote={order.quote} />
      <button type="button" className="button button-secondary button-block" onClick={onNewOrder}>
        Hacer otro pedido
      </button>
    </div>
  );
}
