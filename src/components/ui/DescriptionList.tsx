import { Fragment, type ReactNode } from 'react';

export interface DescriptionItem {
  label: string;
  value: ReactNode;
}

interface DescriptionListProps {
  items: DescriptionItem[];
  /** Classes extras para a `dl` (ex.: espaçamento vertical/margens específicas da tela). */
  className?: string;
}

/**
 * Lista de definição rótulo/valor usada nas telas de detalhe (Débito,
 * Lançamento, Membro, Loja). Padroniza a coluna de rótulo em 180px.
 */
export function DescriptionList({ items, className = '' }: DescriptionListProps) {
  return (
    <dl className={`grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-[180px_1fr] ${className}`}>
      {items.map((item) => (
        <Fragment key={item.label}>
          <dt className="text-sm font-medium text-slate-500">{item.label}</dt>
          <dd className="m-0 text-sm text-slate-900">{item.value}</dd>
        </Fragment>
      ))}
    </dl>
  );
}
