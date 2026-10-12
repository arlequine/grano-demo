import { useState, type FormEvent } from 'react';
import type { Customer } from '../types';

type Props = {
  submitting: boolean;
  error: string | null;
  fieldErrors: Partial<Record<keyof Customer, string>>;
  onSubmit: (customer: Customer) => void;
  onBack: () => void;
};

const FIELDS: { name: keyof Customer; label: string; type: string; autoComplete: string; placeholder?: string }[] = [
  { name: 'name', label: 'Nombre completo', type: 'text', autoComplete: 'name' },
  { name: 'email', label: 'Correo electrónico', type: 'email', autoComplete: 'email', placeholder: 'tu@correo.com' },
  { name: 'phone', label: 'Teléfono', type: 'tel', autoComplete: 'tel', placeholder: '55 1234 5678' },
  { name: 'address', label: 'Dirección de envío', type: 'text', autoComplete: 'street-address', placeholder: 'Calle, número, colonia, ciudad, CP' },
];

export function CheckoutForm({ submitting, error, fieldErrors, onSubmit, onBack }: Props) {
  const [customer, setCustomer] = useState<Customer>({ name: '', email: '', phone: '', address: '' });

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    onSubmit(customer);
  }

  return (
    <form className="checkout-form" onSubmit={handleSubmit} noValidate>
      <h3>Datos de envío</h3>
      {FIELDS.map((field) => {
        const errorId = `${field.name}-error`;
        const fieldError = fieldErrors[field.name];
        return (
          <div key={field.name} className="field">
            <label htmlFor={field.name}>{field.label}</label>
            {field.name === 'address' ? (
              <textarea
                id={field.name}
                rows={2}
                value={customer.address}
                onChange={(event) => setCustomer({ ...customer, address: event.target.value })}
                autoComplete={field.autoComplete}
                placeholder={field.placeholder}
                aria-invalid={fieldError ? true : undefined}
                aria-describedby={fieldError ? errorId : undefined}
              />
            ) : (
              <input
                id={field.name}
                type={field.type}
                value={customer[field.name]}
                onChange={(event) => setCustomer({ ...customer, [field.name]: event.target.value })}
                autoComplete={field.autoComplete}
                placeholder={field.placeholder}
                aria-invalid={fieldError ? true : undefined}
                aria-describedby={fieldError ? errorId : undefined}
              />
            )}
            {fieldError && (
              <p id={errorId} className="field-error">
                {fieldError}
              </p>
            )}
          </div>
        );
      })}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div className="checkout-actions">
        <button type="submit" className="button button-primary button-block" disabled={submitting}>
          {submitting ? 'Confirmando…' : 'Confirmar pedido'}
        </button>
        <button type="button" className="link-button" onClick={onBack} disabled={submitting}>
          ← Volver al carrito
        </button>
      </div>
    </form>
  );
}
