import type { SelectHTMLAttributes } from 'react';
import { ChevronDown } from 'lucide-react';
import { inputClass } from './Input';

/** Select estilizado do design system (wrapper para posicionar o chevron). */
export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  const { className = '', ...rest } = props;
  return (
    <div className="relative">
      <select
        className={`${inputClass} appearance-none pr-9 ${className}`}
        {...rest}
      />
      <ChevronDown
        size={16}
        aria-hidden="true"
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
      />
    </div>
  );
}
