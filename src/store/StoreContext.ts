import { createContext } from 'react';
import type { Loja } from '../types/loja';

export interface StoreContextValue {
  /** Loja atual (primeira loja cadastrada, ver utils/currentStore.ts) ou null se não houver. */
  loja: Loja | null;
  /** Primeira carga da loja em andamento. */
  loading: boolean;
  /** Mensagem do erro da última carga (null quando a carga teve sucesso). */
  error: string | null;
  /**
   * Recarrega a loja atual sem voltar ao estado `loading` (ex.: após cadastrar
   * a loja). Nunca rejeita: uma falha é exposta em `error`.
   */
  refresh: () => Promise<void>;
}

export const StoreContext = createContext<StoreContextValue | null>(null);
