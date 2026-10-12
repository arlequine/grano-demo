import { useEffect, useState } from 'react';
import { ApiError, createOrder, fetchProducts, fetchQuote } from './api';
import { CartLines } from './components/CartLines';
import { CheckoutForm } from './components/CheckoutForm';
import { CouponForm } from './components/CouponForm';
import { OrderConfirmation } from './components/OrderConfirmation';
import { ProductCard } from './components/ProductCard';
import { Totals } from './components/Totals';
import { formatMoney } from './format';
import type { CartItem, Customer, Order, Product, Quote } from './types';

// Mismo límite por línea que valida la API (docs/plan.md §2); además, nunca más que el stock.
const MAX_QUANTITY = 20;

type Step = 'cart' | 'checkout' | 'confirmed';
type FieldErrors = Partial<Record<keyof Customer, string>>;

function fieldErrorsFrom(err: ApiError): FieldErrors {
  const errors: FieldErrors = {};
  for (const { path, message } of err.details) {
    const [root, field] = path.split('.');
    if (root === 'customer' && field && !(field in errors)) {
      errors[field as keyof Customer] = message;
    }
  }
  return errors;
}

export default function App() {
  const [products, setProducts] = useState<Product[] | null>(null);
  const [productsError, setProductsError] = useState<string | null>(null);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [stockNotice, setStockNotice] = useState<string | null>(null);

  const [quote, setQuote] = useState<Quote | null>(null);
  const [quotePending, setQuotePending] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);

  const [step, setStep] = useState<Step>('cart');
  const [order, setOrder] = useState<Order | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  function loadProducts() {
    setProductsError(null);
    fetchProducts()
      .then(setProducts)
      .catch((err: Error) => setProductsError(err.message));
  }

  useEffect(loadProducts, []);

  // Cada cambio del carrito o del cupón pide los montos a la API.
  useEffect(() => {
    if (cart.length === 0) {
      setQuote(null);
      setQuoteError(null);
      setQuotePending(false);
      return;
    }
    const controller = new AbortController();
    setQuotePending(true);
    const timer = setTimeout(() => {
      fetchQuote(cart, appliedCoupon, controller.signal)
        .then((result) => {
          setQuote(result);
          setQuoteError(null);
          if (result.coupon?.status === 'invalid') {
            setCouponError(result.coupon.message);
            setAppliedCoupon(null);
          }
        })
        .catch((err: Error) => {
          if (controller.signal.aborted) return;
          if (err instanceof ApiError && err.code === 'OUT_OF_STOCK') {
            adjustForStock(err);
          } else {
            setQuoteError(err.message);
          }
        })
        .finally(() => {
          if (!controller.signal.aborted) setQuotePending(false);
        });
    }, 150);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [cart, appliedCoupon]);

  function quantityOf(productId: string): number {
    return cart.find((item) => item.productId === productId)?.quantity ?? 0;
  }

  function maxQuantityFor(productId: string): number {
    const stock = products?.find((product) => product.id === productId)?.stock ?? 0;
    return Math.min(stock, MAX_QUANTITY);
  }

  function setQuantity(productId: string, quantity: number) {
    setStockNotice(null);
    setCart((current) => {
      const bounded = Math.min(quantity, maxQuantityFor(productId));
      if (bounded <= 0) return current.filter((item) => item.productId !== productId);
      if (!current.some((item) => item.productId === productId)) {
        return [...current, { productId, quantity: bounded }];
      }
      return current.map((item) => (item.productId === productId ? { ...item, quantity: bounded } : item));
    });
  }

  // Otro pedido se llevó el stock mientras armabas el carrito: la API responde 409 con lo
  // que queda de cada café, ajustamos las cantidades y refrescamos el catálogo.
  function adjustForStock(err: ApiError) {
    const available = new Map<string, number>();
    for (const detail of err.details) {
      if (detail.productId !== undefined && detail.available !== undefined) {
        available.set(detail.productId, detail.available);
      }
    }
    setCart((current) =>
      current
        .map((item) =>
          available.has(item.productId)
            ? { ...item, quantity: Math.min(item.quantity, available.get(item.productId)!) }
            : item,
        )
        .filter((item) => item.quantity > 0),
    );
    setStockNotice(`Ajustamos tu carrito: ${err.details.map((detail) => detail.message).join('. ')}.`);
    loadProducts();
  }

  function addToCart(productId: string) {
    if (step === 'confirmed') setStep('cart');
    setQuantity(productId, quantityOf(productId) + 1);
  }

  function applyCoupon(code: string) {
    setCouponError(null);
    setAppliedCoupon(code.trim());
  }

  function removeCoupon() {
    setCouponError(null);
    setAppliedCoupon(null);
  }

  async function submitOrder(customer: Customer) {
    setSubmitting(true);
    setOrderError(null);
    setFieldErrors({});
    try {
      const created = await createOrder(cart, appliedCoupon, customer);
      setOrder(created);
      setStep('confirmed');
      setCart([]);
      setAppliedCoupon(null);
      setCouponError(null);
      setStockNotice(null);
      loadProducts();
      document.getElementById('carrito')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (err) {
      if (err instanceof ApiError && err.code === 'OUT_OF_STOCK') {
        adjustForStock(err);
        setStep('cart');
      } else if (err instanceof ApiError) {
        const errors = fieldErrorsFrom(err);
        setFieldErrors(errors);
        setOrderError(Object.keys(errors).length > 0 ? 'Revisa los datos marcados.' : err.message);
        if (err.code === 'INVALID_COUPON') removeCoupon();
      } else {
        setOrderError('Algo salió mal. Inténtalo de nuevo.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  function startNewOrder() {
    setOrder(null);
    setStep('cart');
    document.getElementById('catalogo')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const canCheckout = cart.length > 0 && quote !== null && !quotePending && !quoteError;

  return (
    <>
      <header className="site-header">
        <div className="container header-inner">
          <a className="logo" href="#catalogo">
            grano
          </a>
          <p className="tagline">Café de especialidad de microtostadores locales</p>
        </div>
      </header>

      <section className="hero">
        <div className="container">
          <h1>Café recién tostado, sin complicaciones.</h1>
          <p>
            Elige por sabor: cada bolsa dice de dónde viene y a qué sabe. Envío gratis desde $600. Usa{' '}
            <strong>BIENVENIDA10</strong> en tu primera compra.
          </p>
        </div>
      </section>

      <main className="container layout">
        <section id="catalogo" className="catalog" aria-labelledby="catalog-title">
          <h2 id="catalog-title">Nuestros cafés</h2>
          {productsError && (
            <div className="notice notice-error" role="alert">
              <p>{productsError}</p>
              <button type="button" className="button button-secondary" onClick={loadProducts}>
                Reintentar
              </button>
            </div>
          )}
          {!products && !productsError && <p className="notice">Cargando cafés…</p>}
          {products && (
            <div className="product-grid">
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  quantityInCart={quantityOf(product.id)}
                  canAdd={quantityOf(product.id) < maxQuantityFor(product.id)}
                  onAdd={() => addToCart(product.id)}
                />
              ))}
            </div>
          )}
        </section>

        <aside id="carrito" className="cart-panel" aria-labelledby="cart-title">
          {step === 'confirmed' && order ? (
            <OrderConfirmation order={order} onNewOrder={startNewOrder} />
          ) : (
            <>
              <h2 id="cart-title">
                {step === 'checkout' ? 'Tu pedido' : 'Tu carrito'}
                {itemCount > 0 && <span className="cart-count">{itemCount}</span>}
              </h2>

              {stockNotice && (
                <p className="stock-notice" role="status">
                  {stockNotice}
                </p>
              )}

              {cart.length === 0 ? (
                <p className="cart-empty">
                  Tu carrito está vacío. Agrega una bolsa para ver el total con envío.
                </p>
              ) : (
                <>
                  <CartLines
                    items={cart}
                    products={products ?? []}
                    quote={quote}
                    maxQuantityFor={maxQuantityFor}
                    readOnly={step === 'checkout'}
                    onChangeQuantity={setQuantity}
                  />
                  {step === 'cart' && (
                    <CouponForm
                      appliedCode={appliedCoupon && (quote?.coupon?.status === 'applied' ? quote.coupon.code : appliedCoupon)}
                      error={couponError}
                      disabled={quotePending}
                      onApply={applyCoupon}
                      onRemove={removeCoupon}
                    />
                  )}
                  {quoteError && (
                    <p className="form-error" role="alert">
                      {quoteError}
                    </p>
                  )}
                  {quote && <Totals quote={quote} pending={quotePending} />}

                  {step === 'cart' ? (
                    <button
                      type="button"
                      className="button button-primary button-block"
                      disabled={!canCheckout}
                      onClick={() => {
                        setOrderError(null);
                        setFieldErrors({});
                        setStep('checkout');
                      }}
                    >
                      Continuar con el pedido
                    </button>
                  ) : (
                    <CheckoutForm
                      submitting={submitting}
                      error={orderError}
                      fieldErrors={fieldErrors}
                      onSubmit={submitOrder}
                      onBack={() => setStep('cart')}
                    />
                  )}
                </>
              )}
            </>
          )}
        </aside>
      </main>

      {itemCount > 0 && step !== 'confirmed' && (
        <a className="mobile-cart-bar" href="#carrito">
          <span>
            {itemCount} {itemCount === 1 ? 'bolsa' : 'bolsas'}
          </span>
          <span>{quote && !quotePending ? formatMoney(quote.totalCents) : 'Calculando…'} · Ver carrito</span>
        </a>
      )}

      <footer className="site-footer">
        <div className="container">Grano · Demo de AI for Developers. No se procesan pagos reales.</div>
      </footer>
    </>
  );
}
