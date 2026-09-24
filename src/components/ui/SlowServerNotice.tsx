import { useSlowIndicator } from '../../hooks/useSlowIndicator';

export const SLOW_SERVER_MESSAGE = 'O servidor está iniciando, isso pode levar até 1 minuto…';

interface SlowServerNoticeProps {
  /** Operação em curso (ex.: login, checagem de sessão). */
  pending: boolean;
  className?: string;
}

/**
 * Aviso exibido quando uma operação demora além do normal — tipicamente o
 * backend saindo da hibernação. Some sozinho quando a operação termina.
 */
export function SlowServerNotice({ pending, className = '' }: SlowServerNoticeProps) {
  const slow = useSlowIndicator(pending);
  if (!slow) return null;
  return (
    <p role="status" aria-live="polite" className={`text-center text-sm text-slate-500 ${className}`}>
      {SLOW_SERVER_MESSAGE}
    </p>
  );
}
