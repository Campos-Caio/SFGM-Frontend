import { useEffect, useState } from 'react';
import { getCurrentStore } from '../utils/currentStore';
import type { Loja } from '../types/loja';
import { extractErrorMessage } from '../api/client';

interface UseCurrentStoreResult {
  loja: Loja | null;
  loading: boolean;
  error: string | null;
}

/**
 * Hook de acesso à "loja atual" (ver utils/currentStore.ts). Usado por
 * praticamente toda tela que precisa de loja_id para consultar a API.
 */
export function useCurrentStore(): UseCurrentStoreResult {
  const [loja, setLoja] = useState<Loja | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
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

  return { loja, loading, error };
}
