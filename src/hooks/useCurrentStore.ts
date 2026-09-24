import { useContext } from 'react';
import { StoreContext, type StoreContextValue } from '../store/StoreContext';

/**
 * Hook de acesso à "loja atual" (ver utils/currentStore.ts). Usado por
 * praticamente toda tela que precisa de loja_id para consultar a API. O
 * estado é compartilhado via <StoreProvider> (montado por RequireAuth).
 */
export function useCurrentStore(): StoreContextValue {
  const value = useContext(StoreContext);
  if (!value) {
    throw new Error('useCurrentStore deve ser usado dentro de <StoreProvider>.');
  }
  return value;
}
