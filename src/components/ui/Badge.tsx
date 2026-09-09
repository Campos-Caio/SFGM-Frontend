import type { ReactNode } from 'react';

export type BadgeVariant = 'success' | 'danger' | 'warning' | 'neutral' | 'info';

const variantClasses: Record<BadgeVariant, string> = {
  success: 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200',
  danger: 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-200',
  warning: 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200',
  neutral: 'bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-200',
  info: 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200',
};

const dotClasses: Record<BadgeVariant, string> = {
  success: 'bg-emerald-500',
  danger: 'bg-red-500',
  warning: 'bg-amber-500',
  neutral: 'bg-slate-400',
  info: 'bg-blue-500',
};

interface BadgeProps {
  variant: BadgeVariant;
  children: ReactNode;
  /** Exibe um indicador de status (bolinha) antes do texto. */
  dot?: boolean;
  className?: string;
}

/** Selo de status/categoria — mesma aparência para todas as telas do sistema. */
export function Badge({ variant, children, dot = false, className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${variantClasses[variant]} ${className}`}
    >
      {dot ? <span className={`h-1.5 w-1.5 rounded-full ${dotClasses[variant]}`} aria-hidden="true" /> : null}
      {children}
    </span>
  );
}

/** Badge padronizado para o status Ativo/Inativo de um Membro. */
export function StatusBadge({ status }: { status: 'ATIVO' | 'INATIVO' }) {
  return (
    <Badge variant={status === 'ATIVO' ? 'success' : 'neutral'} dot>
      {status === 'ATIVO' ? 'Ativo' : 'Inativo'}
    </Badge>
  );
}
