import type { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
}

/** Container em cartão: base visual única para blocos de conteúdo do sistema. */
export function Card({ children, className = '' }: CardProps) {
  return (
    <section
      className={`bg-white border border-slate-200 rounded-lg shadow-sm p-6 ${className}`}
    >
      {children}
    </section>
  );
}

interface CardHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

/** Cabeçalho padrão de uma seção dentro de um Card (título + descrição + ação). */
export function CardHeader({ title, description, actions, className = '' }: CardHeaderProps) {
  return (
    <div className={`flex items-start justify-between gap-4 flex-wrap mb-4 ${className}`}>
      <div>
        <h3 className="text-base font-semibold text-slate-900 m-0">{title}</h3>
        {description ? <p className="mt-1 text-sm text-slate-500 m-0">{description}</p> : null}
      </div>
      {actions ? <div className="flex items-center gap-2 shrink-0">{actions}</div> : null}
    </div>
  );
}
