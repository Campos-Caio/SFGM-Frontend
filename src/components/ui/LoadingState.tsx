import { Loader2 } from 'lucide-react';

interface LoadingStateProps {
  message?: string;
}

/** Indicador de carregamento textual simples, usado enquanto uma requisição está em curso. */
export function LoadingState({ message = 'Carregando...' }: LoadingStateProps) {
  return (
    <p role="status" className="flex items-center justify-center gap-2 py-10 text-sm text-slate-500">
      <Loader2 size={16} className="animate-spin" aria-hidden="true" />
      {message}
    </p>
  );
}
