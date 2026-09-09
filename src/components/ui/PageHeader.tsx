import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}

/** Cabeçalho padrão de página: título + descrição curta + ação principal à direita. */
export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
      <div>
        <h1 className="m-0 text-[1.75rem] leading-tight font-semibold text-slate-900">{title}</h1>
        {description ? <p className="mt-1 text-sm text-slate-500 m-0">{description}</p> : null}
      </div>
      {actions ? <div className="flex items-center gap-3 shrink-0">{actions}</div> : null}
    </div>
  );
}
