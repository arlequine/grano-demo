import { formatMoney } from '../format';
import type { Product } from '../types';

type Props = {
  product: Product;
  quantityInCart: number;
  canAdd: boolean;
  onAdd: () => void;
};

// A partir de cuántas bolsas se avisa que quedan pocas.
const LOW_STOCK = 3;

// Clase de color de la bolsa según el tueste: "Medio-oscuro" → "roast-medio-oscuro".
function roastClass(roast: string): string {
  return `roast-${roast.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z]+/g, '-')}`;
}

export function ProductCard({ product, quantityInCart, canAdd, onAdd }: Props) {
  const soldOut = product.stock === 0;
  const lowStock = !soldOut && product.stock <= LOW_STOCK;
  return (
    <article className={`product-card${soldOut ? ' is-sold-out' : ''}`}>
      {soldOut && <span className="stock-badge stock-badge-out">Agotado</span>}
      {lowStock && <span className="stock-badge stock-badge-low">¡Quedan {product.stock}!</span>}
      <div className={`product-bag ${roastClass(product.roast)}`} aria-hidden="true">
        <span className="bag-label">
          <span className="bag-brand">grano</span>
          <span className="bag-name">{product.name}</span>
          <span className="bag-weight">{product.grams} g</span>
        </span>
      </div>
      <div className="product-body">
        <h3 className="product-name">{product.name}</h3>
        <p className="product-region">{product.region}</p>
        <dl className="product-facts">
          <div>
            <dt>Proceso</dt>
            <dd>{product.process}</dd>
          </div>
          <div>
            <dt>Tueste</dt>
            <dd>{product.roast}</dd>
          </div>
        </dl>
        <p className="visually-hidden">Notas de cata:</p>
        <ul className="product-notes">
          {product.notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
        <div className="product-footer">
          <p className="product-price">
            {formatMoney(product.priceCents)}
            <span> / bolsa de {product.grams} g</span>
          </p>
          <button type="button" className="button button-primary" onClick={onAdd} disabled={soldOut || !canAdd}>
            {soldOut ? 'Agotado' : quantityInCart > 0 ? `Agregar otra (${quantityInCart})` : 'Agregar'}
          </button>
        </div>
      </div>
    </article>
  );
}
