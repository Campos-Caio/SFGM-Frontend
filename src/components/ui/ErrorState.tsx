import { AlertTriangle } from 'lucide-react';
import { Button } from './Button';

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
  className?: string;
}

/**
 * Estado de erro amigável para falhas de carregamento: nunca expõe stack
 * trace/detalhe técnico — apenas a mensagem já tratada por extractErrorMessage
 * e, quando fizer sentido, uma ação para tentar novamente.
 */
export function ErrorState({ message, onRetry, className = '' }: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={`flex flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-red-200 bg-red-50/60 px-6 py-12 text-center ${className}`}
    >
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600">
        <AlertTriangle size={22} aria-hidden="true" />
      </div>
      <p className="text-sm font-semibold text-slate-900 m-0">Não foi possível carregar os dados</p>
      <p className="mt-1 max-w-sm text-sm text-slate-500 m-0">{message}</p>
      {onRetry ? (
        <div className="mt-4">
          <Button variant="secondary" size="sm" onClick={onRetry}>
            Tentar novamente
          </Button>
        </div>
      ) : null}
    </div>
  );
}
