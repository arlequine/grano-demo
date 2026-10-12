import { formatMoney } from '../format';
import type { Product } from '../types';

type Props = {
  product: Product;
  quantityInCart: number;
  canAdd: boolean;
  onAdd: () => void;
};

// Clase de color de la bolsa según el tueste: "Medio-oscuro" → "roast-medio-oscuro".
function roastClass(roast: string): string {
  return `roast-${roast.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z]+/g, '-')}`;
}

export function ProductCard({ product, quantityInCart, canAdd, onAdd }: Props) {
  return (
    <article className="product-card">
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
          <button type="button" className="button button-primary" onClick={onAdd} disabled={!canAdd}>
            {quantityInCart > 0 ? `Agregar otra (${quantityInCart})` : 'Agregar'}
          </button>
        </div>
      </div>
    </article>
  );
}
