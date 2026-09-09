import type { ReactNode } from 'react';

interface FormFieldProps {
  label: string;
  htmlFor: string;
  children: ReactNode;
  required?: boolean;
  error?: string;
  hint?: string;
}

/** Campo de formulário rotulado: label acima do input, erro/dica abaixo. */
export function FormField({ label, htmlFor, children, required, error, hint }: FormFieldProps) {
  return (
    <div className="mb-4 flex flex-col">
      <label htmlFor={htmlFor} className="mb-1.5 text-sm font-medium text-slate-700">
        {label}
        {required ? <span className="text-red-600"> *</span> : null}
      </label>
      {children}
      {error ? (
        <p className="mt-1.5 text-sm text-red-600">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-sm text-slate-500">{hint}</p>
      ) : null}
    </div>
  );
}

interface FilterFieldProps {
  label: string;
  htmlFor: string;
  children: ReactNode;
}

/**
 * Variante de FormField para barras de filtro: sem margem inferior própria,
 * pensada para um container flex `items-end`.
 */
export function FilterField({ label, htmlFor, children }: FilterFieldProps) {
  return (
    <div className="flex flex-col min-w-[10rem]">
      <label htmlFor={htmlFor} className="mb-1.5 text-sm font-medium text-slate-700">
        {label}
      </label>
      {children}
    </div>
  );
}
