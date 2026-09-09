import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Inbox } from 'lucide-react';

interface EmptyStateProps {
  /** Ícone lucide-react ilustrativo (padrão: Inbox). */
  icon?: LucideIcon;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}

/**
 * Estado vazio estruturado (lista sem itens, filtro sem resultado, etc.):
 * ícone + título + descrição + ação opcional.
 */
export function EmptyState({ icon: Icon = Inbox, title, description, action, className = '' }: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-slate-300 bg-white px-6 py-12 text-center ${className}`}
    >
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
        <Icon size={22} aria-hidden="true" />
      </div>
      <p className="text-sm font-semibold text-slate-900 m-0">{title}</p>
      {description ? <p className="mt-1 max-w-sm text-sm text-slate-500 m-0">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
