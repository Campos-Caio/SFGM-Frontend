import type { ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type AlertVariant = 'success' | 'error' | 'warning' | 'info';

const variantClasses: Record<AlertVariant, string> = {
  success: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  error: 'bg-red-50 text-red-800 border-red-200',
  warning: 'bg-amber-50 text-amber-800 border-amber-200',
  info: 'bg-blue-50 text-blue-800 border-blue-200',
};

const iconClasses: Record<AlertVariant, string> = {
  success: 'text-emerald-500',
  error: 'text-red-500',
  warning: 'text-amber-500',
  info: 'text-blue-500',
};

const variantIcons: Record<AlertVariant, LucideIcon> = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

interface AlertProps {
  variant: AlertVariant;
  title?: ReactNode;
  children: ReactNode;
  className?: string;
}

/** Mensagem de feedback (sucesso/erro/aviso/informação), padrão único em todo o sistema. */
export function Alert({ variant, title, children, className = '' }: AlertProps) {
  const Icon = variantIcons[variant];
  return (
    <div
      role={variant === 'error' ? 'alert' : 'status'}
      className={`flex items-start gap-3 rounded-md border px-4 py-3 mb-4 text-sm ${variantClasses[variant]} ${className}`}
    >
      <Icon size={18} className={`mt-0.5 shrink-0 ${iconClasses[variant]}`} aria-hidden="true" />
      <div>
        {title ? <p className="font-semibold m-0 mb-0.5">{title}</p> : null}
        <div>{children}</div>
      </div>
    </div>
  );
}
