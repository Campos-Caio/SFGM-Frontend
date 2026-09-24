import type { InputHTMLAttributes, ReactNode } from 'react';

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  /** Texto clicável ao lado da caixa (compõe o nome acessível). */
  label: ReactNode;
  /** Texto de apoio abaixo do rótulo. */
  hint?: ReactNode;
}

/** Caixa de seleção do design system: checkbox nativo + rótulo clicável. */
export function Checkbox({ label, hint, id, className = '', ...rest }: CheckboxProps) {
  const hintId = hint && id ? `${id}-hint` : undefined;
  return (
    <div className={`mb-4 flex items-start gap-2 ${className}`}>
      <input
        id={id}
        type="checkbox"
        aria-describedby={hintId}
        className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border-slate-300 text-blue-600 accent-blue-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed"
        {...rest}
      />
      <div className="flex flex-col">
        <label htmlFor={id} className="cursor-pointer text-sm font-medium text-slate-700">
          {label}
        </label>
        {hint ? (
          <p id={hintId} className="mt-0.5 text-sm text-slate-500 m-0">
            {hint}
          </p>
        ) : null}
      </div>
    </div>
  );
}
