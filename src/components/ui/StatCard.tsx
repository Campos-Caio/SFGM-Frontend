import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

export type StatCardTone = 'neutral' | 'success' | 'danger';

const toneClasses: Record<StatCardTone, string> = {
  neutral: 'text-slate-900',
  success: 'text-emerald-600',
  danger: 'text-red-600',
};

const iconToneClasses: Record<StatCardTone, string> = {
  neutral: 'bg-slate-100 text-slate-500',
  success: 'bg-emerald-50 text-emerald-600',
  danger: 'bg-red-50 text-red-600',
};

interface StatCardProps {
  label: string;
  value: ReactNode;
  icon?: LucideIcon;
  tone?: StatCardTone;
  hint?: ReactNode;
}

/** Cartão de indicador (KPI): rótulo, valor em destaque e ícone contextual. */
export function StatCard({ label, value, icon: Icon, tone = 'neutral', hint }: StatCardProps) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 m-0">{label}</p>
        {Icon ? (
          <span className={`flex h-8 w-8 items-center justify-center rounded-full ${iconToneClasses[tone]}`}>
            <Icon size={16} aria-hidden="true" />
          </span>
        ) : null}
      </div>
      <p className={`mt-2 text-2xl font-semibold tabular-nums m-0 ${toneClasses[tone]}`}>{value}</p>
      {hint ? <p className="mt-1 text-xs text-slate-500 m-0">{hint}</p> : null}
    </div>
  );
}
