import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { extractErrorMessage } from '../api/client';
import { getCurrentStore } from '../utils/currentStore';
import type { Loja } from '../types/loja';
import { StoreContext, type StoreContextValue } from './StoreContext';

/**
 * Fonte única da "loja atual" para toda a área autenticada: carrega uma
 * única vez (em vez de cada tela buscar a sua) e permite recarregar após o
 * cadastro da loja, para que Header e telas reflitam a mudança sem reload.
 * Montado por RequireAuth somente com sessão válida.
 */
export function StoreProvider({ children }: { children: ReactNode }) {
  const [loja, setLoja] = useState<Loja | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getCurrentStore()
      .then((result) => {
        if (active) setLoja(result);
      })
      .catch((err) => {
        if (active) setError(extractErrorMessage(err));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    try {
      const result = await getCurrentStore();
      setLoja(result);
      setError(null);
    } catch (err) {
      setError(extractErrorMessage(err));
    }
  }, []);

  const value = useMemo<StoreContextValue>(
    () => ({ loja, loading, error, refresh }),
    [loja, loading, error, refresh]
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}
