import type { ReactNode } from 'react';

/** Faixa de ações de formulário (Cancelar/Salvar), sempre alinhada à direita. */
export function FormActions({ children }: { children: ReactNode }) {
  return <div className="flex justify-end gap-3 pt-2">{children}</div>;
}
