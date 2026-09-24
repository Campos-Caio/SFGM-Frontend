import { createContext, useContext } from 'react';
import type { Usuario } from '../types/auth';

/**
 * - checking: a sessão (cookie) está sendo validada (GET /auth/me);
 * - authenticated: sessão válida, `usuario` preenchido;
 * - unauthenticated: sem sessão (nunca logou, logout ou 401);
 * - error: não foi possível validar a sessão (ex.: servidor fora do ar).
 */
export type AuthStatus = 'checking' | 'authenticated' | 'unauthenticated' | 'error';

export interface AuthContextValue {
  status: AuthStatus;
  usuario: Usuario | null;
  /** Mensagem do erro de validação da sessão (status `error`). */
  error: string | null;
  /** Autentica e carrega o usuário; rejeita com o erro da API em caso de falha. */
  login: (login: string, senha: string) => Promise<void>;
  /** Encerra a sessão (POST /auth/logout) e o estado local, mesmo se a chamada falhar. */
  logout: () => Promise<void>;
  /** Tenta validar novamente a sessão salva (após status `error`). */
  retry: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

/** Acesso à sessão do usuário; exige estar dentro de <AuthProvider>. */
export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error('useAuth deve ser usado dentro de <AuthProvider>.');
  }
  return value;
}
