import { useState, type FormEvent } from 'react';

type Props = {
  appliedCode: string | null;
  error: string | null;
  disabled: boolean;
  onApply: (code: string) => void;
  onRemove: () => void;
};

export function CouponForm({ appliedCode, error, disabled, onApply, onRemove }: Props) {
  const [code, setCode] = useState('');

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (code.trim()) onApply(code);
  }

  if (appliedCode) {
    return (
      <div className="coupon coupon-applied">
        <span>
          Cupón <strong>{appliedCode}</strong> aplicado
        </span>
        <button type="button" className="link-button" onClick={onRemove} disabled={disabled}>
          Quitar
        </button>
      </div>
    );
  }

  return (
    <form className="coupon" onSubmit={handleSubmit} noValidate>
      <label htmlFor="coupon-code">¿Tienes un cupón?</label>
      <div className="coupon-row">
        <input
          id="coupon-code"
          type="text"
          value={code}
          onChange={(event) => setCode(event.target.value)}
          placeholder="Escribe tu código"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          maxLength={50}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? 'coupon-error' : undefined}
        />
        <button type="submit" className="button button-secondary" disabled={disabled || !code.trim()}>
          Aplicar
        </button>
      </div>
      {error && (
        <p id="coupon-error" className="field-error" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
